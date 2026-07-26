import { useEffect, useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { getReport } from '../api/reports';
import { ReportForm } from '../components/reports/ReportForm';
import { Spinner } from '../components/ui/Spinner';
import { useAuthStore } from '../stores/authStore';
import type { Report } from '../types';

export default function ReportEditPage() {
  const { id } = useParams<{ id: string }>();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    getReport(Number(id))
      .then(setReport)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="flex justify-center py-16"><Spinner /></div>;
  if (!report) return <p className="text-surface-500 text-center py-16">周报不存在</p>;
  if (user?.id !== report.user_id || report.status !== 'draft') {
    return <Navigate to={`/reports/${id}`} replace />;
  }

  return <ReportForm report={report} />;
}
