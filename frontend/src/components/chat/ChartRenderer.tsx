import React, { useRef, useState, useMemo } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Download,
  AlertCircle,
  BarChart3,
  LineChart as LineIcon,
  AreaChart as AreaIcon,
  PieChart as PieIcon,
  Check,
} from 'lucide-react';
import type { ChartSpec, ChartType } from '../../types';

interface ChartRendererProps {
  spec: ChartSpec;
}

// 12-color harmonious editorial palette
const PALETTE = [
  '#C8501E', // terracotta
  '#2A4B7C', // navy slate
  '#3E7A5E', // forest green
  '#B28228', // vintage ochre
  '#7D4E7B', // plum
  '#8C4351', // crimson rose
  '#D05C2B', // bright terracotta
  '#3B6B99', // sky steel
  '#4E9A78', // emerald
  '#CC9933', // amber gold
  '#9B6699', // lavender heather
  '#B05E6D', // dusty rose
];

export const ChartRenderer: React.FC<ChartRendererProps> = ({ spec }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartWrapperRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [activeType, setActiveType] = useState<ChartType>(spec?.type || 'bar');

  if (!spec || !spec.data || spec.data.length === 0) {
    return (
      <div className="p-4 bg-[#EFECE4] border border-[#DDD8CB] text-xs text-[#6B665D] flex items-center gap-2">
        <AlertCircle size={14} className="text-[#C8501E]" />
        <span>No chart data available for visualization.</span>
      </div>
    );
  }

  const { title, xKey, yKeys, xLabel, yLabel, data } = spec;

  // Universal sanitization: ensure numeric Y-values are real numbers (DuckDB can return strings/BigInts)
  const cleanData = useMemo(() => {
    return data.map((row) => {
      const cleanRow: Record<string, any> = { ...row };
      for (const yk of yKeys) {
        const val = row[yk];
        if (val !== null && val !== undefined && val !== '') {
          const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/[^0-9.-]+/g, ''));
          cleanRow[yk] = isNaN(num) ? 0 : num;
        } else {
          cleanRow[yk] = 0;
        }
      }
      return cleanRow;
    });
  }, [data, yKeys]);

  // Dedicated Pie Data Processor (recovers from key inversion, converts strings, filters non-positives)
  const pieConfig = useMemo(() => {
    if (cleanData.length === 0) return { categoryKey: xKey, numericKey: yKeys[0] || 'value', pieData: [] };

    let categoryKey = xKey;
    let numericKey = yKeys[0] || '';

    // Auto-detect key inversion: if xKey column is numeric and numericKey column is string
    const firstRow = data[0];
    if (firstRow && numericKey) {
      const xVal = firstRow[xKey];
      const yVal = firstRow[numericKey];
      const xIsPureNum = typeof xVal === 'number' || (typeof xVal === 'string' && /^-?\d+(\.\d+)?$/.test(xVal.trim()));
      const yIsPureNum = typeof yVal === 'number' || (typeof yVal === 'string' && /^-?\d+(\.\d+)?$/.test(yVal.trim()));

      if (xIsPureNum && !yIsPureNum) {
        categoryKey = yKeys[0];
        numericKey = xKey;
      }
    }

    const pieData = cleanData
      .map((row) => {
        const rawNum = row[numericKey];
        const num = typeof rawNum === 'number' ? rawNum : parseFloat(String(rawNum ?? 0));
        return {
          ...row,
          [categoryKey]: String(row[categoryKey] ?? 'Unknown'),
          [numericKey]: isNaN(num) ? 0 : Math.max(0, num),
        };
      })
      .filter((row) => (row[numericKey] as number) > 0)
      .slice(0, 10);

    return { categoryKey, numericKey, pieData };
  }, [cleanData, data, xKey, yKeys]);

  const handleDownloadPng = async () => {
    if (!chartWrapperRef.current) return;
    try {
      setDownloading(true);

      const svgElement =
        chartWrapperRef.current.querySelector<SVGSVGElement>('svg.recharts-surface') ||
        chartWrapperRef.current.querySelector<SVGSVGElement>('svg');

      if (!svgElement) {
        setDownloading(false);
        return;
      }

      const clonedSvg = svgElement.cloneNode(true) as SVGSVGElement;
      const svgWidth = svgElement.clientWidth || 800;
      const svgHeight = svgElement.clientHeight || 360;

      clonedSvg.setAttribute('width', String(svgWidth));
      clonedSvg.setAttribute('height', String(svgHeight));
      clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

      const svgString = new XMLSerializer().serializeToString(clonedSvg);
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const blobURL = URL.createObjectURL(svgBlob);

      const image = new Image();
      image.onload = () => {
        const scale = 2;
        const headerHeight = 76;
        const totalWidth = svgWidth * scale;
        const totalHeight = (svgHeight + headerHeight + 20) * scale;

        const canvas = document.createElement('canvas');
        canvas.width = totalWidth;
        canvas.height = totalHeight;
        const ctx = canvas.getContext('2d');

        if (ctx) {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          ctx.fillStyle = '#1F1E1B';
          ctx.font = 'bold 36px "Newsreader", Georgia, serif';
          ctx.fillText(title || 'TableTalk Analytical Chart', 24 * scale, 34 * scale);

          ctx.fillStyle = '#6E6A60';
          ctx.font = '600 20px "IBM Plex Mono", monospace';
          ctx.fillText(
            `TABLETALK · ${activeType.toUpperCase()} VIEW · ${cleanData.length} DATA POINTS`,
            24 * scale,
            54 * scale
          );

          ctx.strokeStyle = '#DDD8CB';
          ctx.lineWidth = 1.5 * scale;
          ctx.beginPath();
          ctx.moveTo(24 * scale, 64 * scale);
          ctx.lineTo(canvas.width - 24 * scale, 64 * scale);
          ctx.stroke();

          ctx.drawImage(image, 0, headerHeight * scale, svgWidth * scale, svgHeight * scale);

          const pngUrl = canvas.toDataURL('image/png');
          const downloadLink = document.createElement('a');
          const safeName = (title || 'tabletalk_chart').toLowerCase().replace(/[^a-z0-9]+/g, '_');
          downloadLink.download = `${safeName}.png`;
          downloadLink.href = pngUrl;
          document.body.appendChild(downloadLink);
          downloadLink.click();
          document.body.removeChild(downloadLink);

          setDownloadSuccess(true);
          setTimeout(() => setDownloadSuccess(false), 2000);
        }

        URL.revokeObjectURL(blobURL);
        setDownloading(false);
      };

      image.onerror = () => {
        URL.revokeObjectURL(blobURL);
        setDownloading(false);
      };

      image.src = blobURL;
    } catch (err) {
      console.error('Failed to download chart PNG:', err);
      setDownloading(false);
    }
  };

  const renderChart = () => {
    switch (activeType) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={cleanData} margin={{ top: 12, right: 20, left: 10, bottom: 24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#DDD8CB" vertical={false} />
              <XAxis
                dataKey={xKey}
                stroke="#6B665D"
                tick={{ fill: '#6B665D', fontSize: 11, fontFamily: 'IBM Plex Sans, sans-serif' }}
                label={xLabel ? { value: xLabel, position: 'insideBottom', offset: -14, fill: '#6B665D', fontSize: 11 } : undefined}
              />
              <YAxis
                stroke="#6B665D"
                tick={{ fill: '#6B665D', fontSize: 11, fontFamily: 'IBM Plex Mono, monospace' }}
                label={yLabel ? { value: yLabel, angle: -90, position: 'insideLeft', fill: '#6B665D', fontSize: 11 } : undefined}
              />
              <Tooltip
                formatter={(val: any) => [typeof val === 'number' ? val.toLocaleString() : val, '']}
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  borderColor: '#DDD8CB',
                  borderRadius: '4px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  fontSize: '12px',
                  fontFamily: 'IBM Plex Sans, sans-serif',
                }}
              />
              {yKeys.length > 1 && <Legend wrapperStyle={{ fontSize: 11, paddingTop: '8px' }} />}
              {yKeys.map((key, i) => (
                <Bar key={key} dataKey={key} fill={PALETTE[i % PALETTE.length]} radius={[2, 2, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );

      case 'line':
        return (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={cleanData} margin={{ top: 12, right: 20, left: 10, bottom: 24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#DDD8CB" vertical={false} />
              <XAxis
                dataKey={xKey}
                stroke="#6B665D"
                tick={{ fill: '#6B665D', fontSize: 11, fontFamily: 'IBM Plex Sans, sans-serif' }}
                label={xLabel ? { value: xLabel, position: 'insideBottom', offset: -14, fill: '#6B665D', fontSize: 11 } : undefined}
              />
              <YAxis
                stroke="#6B665D"
                tick={{ fill: '#6B665D', fontSize: 11, fontFamily: 'IBM Plex Mono, monospace' }}
                label={yLabel ? { value: yLabel, angle: -90, position: 'insideLeft', fill: '#6B665D', fontSize: 11 } : undefined}
              />
              <Tooltip
                formatter={(val: any) => [typeof val === 'number' ? val.toLocaleString() : val, '']}
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  borderColor: '#DDD8CB',
                  borderRadius: '4px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  fontSize: '12px',
                  fontFamily: 'IBM Plex Sans, sans-serif',
                }}
              />
              {yKeys.length > 1 && <Legend wrapperStyle={{ fontSize: 11, paddingTop: '8px' }} />}
              {yKeys.map((key, i) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={PALETTE[i % PALETTE.length]}
                  strokeWidth={2}
                  dot={{ r: 3, fill: PALETTE[i % PALETTE.length] }}
                  activeDot={{ r: 5 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        );

      case 'area':
        return (
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={cleanData} margin={{ top: 12, right: 20, left: 10, bottom: 24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#DDD8CB" vertical={false} />
              <XAxis
                dataKey={xKey}
                stroke="#6B665D"
                tick={{ fill: '#6B665D', fontSize: 11, fontFamily: 'IBM Plex Sans, sans-serif' }}
                label={xLabel ? { value: xLabel, position: 'insideBottom', offset: -14, fill: '#6B665D', fontSize: 11 } : undefined}
              />
              <YAxis
                stroke="#6B665D"
                tick={{ fill: '#6B665D', fontSize: 11, fontFamily: 'IBM Plex Mono, monospace' }}
                label={yLabel ? { value: yLabel, angle: -90, position: 'insideLeft', fill: '#6B665D', fontSize: 11 } : undefined}
              />
              <Tooltip
                formatter={(val: any) => [typeof val === 'number' ? val.toLocaleString() : val, '']}
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  borderColor: '#DDD8CB',
                  borderRadius: '4px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  fontSize: '12px',
                  fontFamily: 'IBM Plex Sans, sans-serif',
                }}
              />
              {yKeys.length > 1 && <Legend wrapperStyle={{ fontSize: 11, paddingTop: '8px' }} />}
              {yKeys.map((key, i) => (
                <Area
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={PALETTE[i % PALETTE.length]}
                  fill={PALETTE[i % PALETTE.length]}
                  fillOpacity={0.25}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        );

      case 'pie':
        const { categoryKey, numericKey, pieData } = pieConfig;

        if (pieData.length === 0) {
          return (
            <div className="p-8 my-4 text-center bg-[#FAF9F6] border border-[#DDD8CB] rounded-md text-xs font-mono text-[#6E6A60]">
              <p className="mb-2 font-medium text-[#1F1E1B]">No positive numeric values available for Pie representation.</p>
              <p className="text-[11px] text-[#8C8578]">Pie charts require positive numeric shares. Switch to Bar view above to examine these metrics.</p>
            </div>
          );
        }

        return (
          <ResponsiveContainer width="100%" height={340}>
            <PieChart margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
              <Tooltip
                formatter={(value: any) => [
                  typeof value === 'number' ? value.toLocaleString() : value,
                  numericKey,
                ]}
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  borderColor: '#DDD8CB',
                  borderRadius: '4px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  fontSize: '12px',
                  fontFamily: 'IBM Plex Sans, sans-serif',
                }}
              />
              <Legend
                layout="horizontal"
                verticalAlign="bottom"
                align="center"
                wrapperStyle={{
                  fontSize: 11,
                  paddingTop: '12px',
                  fontFamily: 'IBM Plex Sans, sans-serif',
                }}
                formatter={(val: string) => <span className="text-[#1F1E1B]">{val}</span>}
              />
              <Pie
                data={pieData}
                dataKey={numericKey}
                nameKey={categoryKey}
                cx="50%"
                cy="44%"
                outerRadius={95}
                innerRadius={46}
                paddingAngle={2}
                label={({ percent }: { percent?: number }) =>
                  percent && percent >= 0.05 ? `${(percent * 100).toFixed(0)}%` : ''
                }
                labelLine={false}
                isAnimationActive={true}
                animationDuration={600}
              >
                {pieData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    name={String(entry[categoryKey])}
                    fill={PALETTE[index % PALETTE.length]}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        );

      case 'scatter':
        const scatterYKey = yKeys[0];
        return (
          <ResponsiveContainer width="100%" height={320}>
            <ScatterChart margin={{ top: 12, right: 20, left: 10, bottom: 24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#DDD8CB" />
              <XAxis
                dataKey={xKey}
                stroke="#6B665D"
                tick={{ fill: '#6B665D', fontSize: 11, fontFamily: 'IBM Plex Sans, sans-serif' }}
                label={xLabel ? { value: xLabel, position: 'insideBottom', offset: -14, fill: '#6B665D', fontSize: 11 } : undefined}
              />
              <YAxis
                dataKey={scatterYKey}
                stroke="#6B665D"
                tick={{ fill: '#6B665D', fontSize: 11, fontFamily: 'IBM Plex Mono, monospace' }}
                label={yLabel ? { value: yLabel, angle: -90, position: 'insideLeft', fill: '#6B665D', fontSize: 11 } : undefined}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  borderColor: '#DDD8CB',
                  borderRadius: '4px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  fontSize: '12px',
                  fontFamily: 'IBM Plex Sans, sans-serif',
                }}
              />
              <Scatter data={cleanData} fill={PALETTE[0]} />
            </ScatterChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  };

  return (
    <div ref={containerRef} className="my-6 p-4 bg-white border border-[#DDD8CB] max-w-full min-w-0 overflow-hidden rounded-md shadow-2xs">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#DDD8CB] pb-3 mb-4">
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-serif font-bold text-[#1F1E1B] truncate">{title}</h4>
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#6B665D]">
            {activeType.toUpperCase()} VIEW · {cleanData.length} DATA POINTS
          </span>
        </div>

        {/* Dynamic Chart Type Switcher & PNG Export */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center bg-[#FAF9F6] border border-[#DDD8CB] rounded p-0.5">
            <button
              type="button"
              onClick={() => setActiveType('bar')}
              className={`p-1.5 rounded text-xs transition-colors ${
                activeType === 'bar' ? 'bg-[#1F1E1B] text-white shadow-2xs' : 'text-[#6B665D] hover:text-[#1F1E1B]'
              }`}
              title="Switch to Bar chart"
            >
              <BarChart3 size={13} />
            </button>
            <button
              type="button"
              onClick={() => setActiveType('line')}
              className={`p-1.5 rounded text-xs transition-colors ${
                activeType === 'line' ? 'bg-[#1F1E1B] text-white shadow-2xs' : 'text-[#6B665D] hover:text-[#1F1E1B]'
              }`}
              title="Switch to Line chart"
            >
              <LineIcon size={13} />
            </button>
            <button
              type="button"
              onClick={() => setActiveType('area')}
              className={`p-1.5 rounded text-xs transition-colors ${
                activeType === 'area' ? 'bg-[#1F1E1B] text-white shadow-2xs' : 'text-[#6B665D] hover:text-[#1F1E1B]'
              }`}
              title="Switch to Area chart"
            >
              <AreaIcon size={13} />
            </button>
            <button
              type="button"
              onClick={() => setActiveType('pie')}
              className={`p-1.5 rounded text-xs transition-colors ${
                activeType === 'pie' ? 'bg-[#1F1E1B] text-white shadow-2xs' : 'text-[#6B665D] hover:text-[#1F1E1B]'
              }`}
              title="Switch to Pie chart"
            >
              <PieIcon size={13} />
            </button>
          </div>

          <button
            onClick={handleDownloadPng}
            disabled={downloading}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-sans text-[#6B665D] hover:text-[#1F1E1B] border border-[#DDD8CB] bg-[#FAF9F6] hover:bg-[#EFECE4] rounded transition-colors shrink-0"
            title="Download high-resolution chart PNG"
          >
            {downloadSuccess ? (
              <>
                <Check size={12} className="text-emerald-600" />
                <span className="text-emerald-700 font-medium">Saved!</span>
              </>
            ) : (
              <>
                <Download size={12} />
                <span>{downloading ? 'Exporting...' : 'PNG'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Dedicated wrapper ref for SVG chart isolation */}
      <div ref={chartWrapperRef} className="w-full min-w-0 overflow-hidden">
        {renderChart()}
      </div>
    </div>
  );
};
