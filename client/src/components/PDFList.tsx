import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { FileText, Calendar, Eye, AlertCircle, Loader2 } from 'lucide-react';
import { pdfApi } from '@/services/api';
import type { PDFDocument } from '@/types';

export default function PDFList() {
  const navigate = useNavigate();

  const { data, isLoading, error } = useQuery({
    queryKey: ['pdfs'],
    queryFn: async () => {
      const response = await pdfApi.listPDFs();
      return response.data || [];
    },
    refetchInterval: 5000, // Refetch every 5 seconds to check indexing status
  });

  const handlePDFClick = (pdf: PDFDocument) => {
    navigate(`/pdf/${pdf.id}`);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-gray-600">Loading PDFs...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3 text-red-600">
          <AlertCircle className="w-12 h-12" />
          <p className="text-lg font-medium">Failed to load PDFs</p>
          <p className="text-sm text-gray-600">{(error as Error).message}</p>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3 text-gray-500">
          <FileText className="w-16 h-16" />
          <p className="text-lg font-medium">No PDFs found</p>
          <p className="text-sm">Upload a PDF to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
      {data.map((pdf) => (
        <div
          key={pdf.id}
          onClick={() => handlePDFClick(pdf)}
          className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 cursor-pointer overflow-hidden border border-gray-200"
        >
          {/* Thumbnail */}
          <div className="h-48 bg-gray-100 flex items-center justify-center relative">
            {pdf.thumbnail ? (
              <img
                src={pdf.thumbnail}
                alt={pdf.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <FileText className="w-20 h-20 text-gray-400" />
            )}
            {!pdf.indexed && (
              <div className="absolute top-2 right-2 bg-yellow-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                Indexing...
              </div>
            )}
            {pdf.indexed && (
              <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                Indexed
              </div>
            )}
          </div>

          {/* Content */}
          <div className="p-4">
            <h3 className="text-lg font-semibold text-gray-800 truncate mb-2">
              {pdf.title}
            </h3>

            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                <span className="truncate">{pdf.filename}</span>
              </div>

              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4" />
                <span>{pdf.pageCount} pages</span>
                <span className="text-gray-400">•</span>
                <span>{formatFileSize(pdf.filesize)}</span>
              </div>

              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>{formatDate(pdf.uploadedAt)}</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handlePDFClick(pdf);
              }}
              className="w-full text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center justify-center gap-2"
            >
              <Eye className="w-4 h-4" />
              View PDF
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
