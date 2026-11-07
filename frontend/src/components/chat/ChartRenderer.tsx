import React, { useRef, useState } from 'react';
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
import { Download, AlertCircle, BarChart3, LineChart as LineIcon, AreaChart as AreaIcon, PieChart as PieIcon } from 'lucide-react';
import type { ChartSpec, ChartType } from '../../types';

interface ChartRendererProps {
  spec: ChartSpec;
}

const PALETTE = ['#C8501E', '#2A4B7C', '#3E7A5E', '#B28228', '#7D4E7B', '#8C4351'];

export const ChartRenderer: React.FC<ChartRendererProps> = ({ spec }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
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

  const handleDownloadPng = async () => {
    if (!containerRef.current) return;
    try {
      setDownloading(true);
      const svgElement = containerRef.current.querySelector('svg');
      if (!svgElement) return;

      const svgString = new XMLSerializer().serializeToString(svgElement);
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const blobURL = URL.createObjectURL(svgBlob);

      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = svgElement.clientWidth * 2 || 1200;
        canvas.height = svgElement.clientHeight * 2 || 700;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
          const pngUrl = canvas.toDataURL('image/png');
          const downloadLink = document.createElement('a');
          const safeName = (title || 'chart').toLowerCase().replace(/[^a-z0-9]+/g, '_');
          downloadLink.download = `${safeName}.png`;
          downloadLink.href = pngUrl;
          document.body.appendChild(downloadLink);
          downloadLink.click();
          document.body.removeChild(downloadLink);
        }
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
            <BarChart data={data} margin={{ top: 12, right: 20, left: 10, bottom: 24 }}>
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
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  borderColor: '#DDD8CB',
                  borderRadius: '0px',
                  boxShadow: 'none',
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
            <LineChart data={data} margin={{ top: 12, right: 20, left: 10, bottom: 24 }}>
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
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  borderColor: '#DDD8CB',
                  borderRadius: '0px',
                  boxShadow: 'none',
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
            <AreaChart data={data} margin={{ top: 12, right: 20, left: 10, bottom: 24 }}>
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
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  borderColor: '#DDD8CB',
                  borderRadius: '0px',
                  boxShadow: 'none',
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
        const primaryYKey = yKeys[0];
        return (
          <ResponsiveContainer width="100%" height={320}>
            <PieChart margin={{ top: 12, right: 20, left: 20, bottom: 20 }}>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  borderColor: '#DDD8CB',
                  borderRadius: '0px',
                  boxShadow: 'none',
                  fontSize: '12px',
                  fontFamily: 'IBM Plex Sans, sans-serif',
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: '8px' }} />
              <Pie
                data={data.slice(0, 15)}
                dataKey={primaryYKey}
                nameKey={xKey}
                cx="50%"
                cy="50%"
                outerRadius={100}
                innerRadius={45}
                paddingAngle={2}
                label={({ name, percent }: { name?: string; percent?: number }) =>
                  `${name ?? ''} (${((percent ?? 0) * 100).toFixed(0)}%)`
                }
              >
                {data.slice(0, 15).map((_, index) => (
                  <Cell key={`cell-${index}`} fill={PALETTE[index % PALETTE.length]} />
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
                  borderRadius: '0px',
                  boxShadow: 'none',
                  fontSize: '12px',
                  fontFamily: 'IBM Plex Sans, sans-serif',
                }}
              />
              <Scatter data={data} fill={PALETTE[0]} />
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
            {activeType.toUpperCase()} VIEW · {data.length} DATA POINTS
          </span>
        </div>

        {/* Dynamic Chart Type Switcher & PNG Export */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center bg-[#FAF9F6] border border-[#DDD8CB] rounded p-0.5">
            <button
              type="button"
              onClick={() => setActiveType('bar')}
              className={`p-1 rounded text-xs transition-colors ${
                activeType === 'bar' ? 'bg-[#1F1E1B] text-white shadow-2xs' : 'text-[#6B665D] hover:text-[#1F1E1B]'
              }`}
              title="Switch to Bar chart"
            >
              <BarChart3 size={13} />
            </button>
            <button
              type="button"
              onClick={() => setActiveType('line')}
              className={`p-1 rounded text-xs transition-colors ${
                activeType === 'line' ? 'bg-[#1F1E1B] text-white shadow-2xs' : 'text-[#6B665D] hover:text-[#1F1E1B]'
              }`}
              title="Switch to Line chart"
            >
              <LineIcon size={13} />
            </button>
            <button
              type="button"
              onClick={() => setActiveType('area')}
              className={`p-1 rounded text-xs transition-colors ${
                activeType === 'area' ? 'bg-[#1F1E1B] text-white shadow-2xs' : 'text-[#6B665D] hover:text-[#1F1E1B]'
              }`}
              title="Switch to Area chart"
            >
              <AreaIcon size={13} />
            </button>
            <button
              type="button"
              onClick={() => setActiveType('pie')}
              className={`p-1 rounded text-xs transition-colors ${
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
            title="Download chart as PNG image"
          >
            <Download size={12} />
            <span>{downloading ? 'Exporting...' : 'PNG'}</span>
          </button>
        </div>
      </div>

      <div className="w-full min-w-0 overflow-hidden">{renderChart()}</div>
    </div>
  );
};
