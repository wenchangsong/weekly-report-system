import ExcelJS from 'exceljs';
import { getReportsForExport } from './reportService';

export function buildExportWorkbook(filters: {
  weekStart?: string;
  weekEnd?: string;
  userId?: number;
  teamId?: number;
  viewerId?: number;
  status?: string;
}): ExcelJS.Workbook {
  const rows = getReportsForExport(filters) as any[];

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('周报汇总');

  sheet.columns = [
    { header: '姓名', key: 'username', width: 16 },
    { header: '邮箱', key: 'email', width: 28 },
    { header: '周开始', key: 'week_start', width: 14 },
    { header: '周结束', key: 'week_end', width: 14 },
    { header: '本周工作', key: 'work_done', width: 50 },
    { header: '下周计划', key: 'plan_next', width: 50 },
    { header: '问题风险', key: 'issues', width: 40 },
    { header: '状态', key: 'status', width: 10 },
    { header: '提交时间', key: 'created_at', width: 20 },
  ];

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4F46E5' },
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height = 28;

  const statusMap: Record<string, string> = { draft: '草稿', submitted: '已提交' };
  for (const row of rows) {
    const dataRow = sheet.addRow({
      ...row,
      status: statusMap[row.status] || row.status,
    });
    dataRow.alignment = { vertical: 'middle', wrapText: true };
  }

  sheet.views = [{ state: 'frozen', ySplit: 1 }];

  return workbook;
}
