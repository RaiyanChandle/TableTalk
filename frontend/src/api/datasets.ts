import type { Dataset, DatasetUploadResult } from '../types';
import { apiFetch } from './client';

export interface GetDatasetsResponse {
  datasets: Dataset[];
}

export interface GetDatasetPreviewResponse {
  dataset: Dataset;
  previewRows: Record<string, unknown>[];
}

export async function uploadDatasetsApi(files: File[]): Promise<DatasetUploadResult[]> {
  const formData = new FormData();
  for (const file of files) {
    formData.append('files', file);
  }

  const data = await apiFetch<{ results: DatasetUploadResult[] }>('/api/datasets', {
    method: 'POST',
    body: formData,
  });

  return data.results;
}

export async function getDatasetsApi(): Promise<Dataset[]> {
  const data = await apiFetch<GetDatasetsResponse>('/api/datasets', {
    method: 'GET',
  });
  return data.datasets;
}

export async function getDatasetPreviewApi(id: string): Promise<GetDatasetPreviewResponse> {
  return apiFetch<GetDatasetPreviewResponse>(`/api/datasets/${id}`, {
    method: 'GET',
  });
}

export async function renameDatasetApi(
  id: string,
  params: { name?: string; tableName?: string }
): Promise<Dataset> {
  const data = await apiFetch<{ dataset: Dataset }>(`/api/datasets/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(params),
  });
  return data.dataset;
}

export async function deleteDatasetApi(id: string): Promise<void> {
  await apiFetch(`/api/datasets/${id}`, {
    method: 'DELETE',
  });
}

