import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Loader2, AlertCircle, BookOpen } from 'lucide-react';
import { pdfApi } from '@/services/api';
import { useSearchStore } from '@/stores/searchStore';
import PDFViewer from '@/components/PDFViewer';
import SearchPanel from '@/components/SearchPanel';
import LLMChat from '@/components/LLMChat';

export default function PDFDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { searchResult, currentMatchIndex } = useSearchStore();

  const { data: pdf, isLoading, error } = useQuery({
    queryKey: ['pdf', id],
    queryFn: async () => {
      const response = await pdfApi.getPDF(id!);
      return response.data;
    },
    enabled: !!id,
  });

  const currentResult = searchResult?.results?.[currentMatchIndex];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
          <p className="text-lg text-gray-600">Loading PDF...</p>
        </div>
      </div>
    );
  }

  if (error || !pdf) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="flex flex-col items-center gap-4 text-red-600">
          <AlertCircle className="w-16 h-16" />
          <h2 className="text-2xl font-bold">Failed to load PDF</h2>
          <p className="text-gray-600">{(error as Error)?.message || 'PDF not found'}</p>
          <button
            onClick={() => navigate('/')}
            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  const pdfUrl = pdfApi.getPDFFileUrl(pdf.id);

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 z-10">
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Back to home"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>

              <div className="flex items-center gap-3">
                <div className="bg-blue-600 p-2 rounded-lg">
                  <BookOpen className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">{pdf.title}</h1>
                  <p className="text-sm text-gray-600">
                    {pdf.filename} • {pdf.pageCount} pages
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {!pdf.indexed && (
                <div className="bg-yellow-100 border border-yellow-300 text-yellow-800 text-sm px-3 py-1 rounded-full flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Indexing...
                </div>
              )}
              {pdf.indexed && (
                <div className="bg-green-100 border border-green-300 text-green-800 text-sm px-3 py-1 rounded-full">
                  Indexed
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Split View */}
      <div className="flex-1 flex overflow-hidden">
        {/* PDF Viewer - 70% */}
        <div className="flex-[7] min-w-0">
          <PDFViewer pdfUrl={pdfUrl} currentResult={currentResult} />
        </div>

        {/* Search Panel - 30% */}
        <div className="flex-[3] min-w-[320px] max-w-[480px]">
          <SearchPanel pdfId={pdf.id} />
        </div>
      </div>

      {/* Floating Chat Widget */}
      <LLMChat pdfId={pdf.id} />
    </div>
  );
}
