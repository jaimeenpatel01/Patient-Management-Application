import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { Ionicons } from '@expo/vector-icons';
import { getPatients } from '@/services/patientService';
import { getPayments } from '@/services/paymentService';
import { getAttendances } from '@/services/attendanceService';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { useAlert } from '@/contexts/AlertContext';

// A page size large enough to pull every row in one request for a single-doctor
// dataset. Export is a best-effort, online-only action (see summary).
const EXPORT_PAGE_SIZE = 5000;

type ExportKind = 'patients' | 'payments' | 'attendance';
type ExportFormat = 'csv' | 'pdf';

/** Escape a value for a CSV cell: wrap in quotes and double up embedded quotes
 *  whenever the value contains a comma, quote, or newline. */
function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCsv(headers: string[], rows: unknown[][]): string {
  const lines = [headers.map(csvEscape).join(',')];
  for (const row of rows) {
    lines.push(row.map(csvEscape).join(','));
  }
  // CRLF is the most broadly compatible CSV line ending.
  return lines.join('\r\n');
}

/** Escape a value for embedding in HTML — prevents record content (names,
 *  notes, addresses) from being interpreted as markup when rendering the PDF. */
function htmlEscape(value: unknown): string {
  if (value === null || value === undefined || value === '') return '&mdash;';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildPdfHtml(title: string, headers: string[], rows: unknown[][]): string {
  const generatedOn = new Date().toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return `
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 20px; color: #333; }
          h1 { color: #0D9488; border-bottom: 2px solid #0D9488; padding-bottom: 10px; margin-bottom: 4px; }
          .meta { color: #64748b; font-size: 12px; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #ddd; padding: 10px; text-align: left; font-size: 12px; }
          th { background-color: #f0fdfa; color: #0D9488; font-weight: bold; }
          tr:nth-child(even) td { background-color: #f8fafc; }
        </style>
      </head>
      <body>
        <h1>${htmlEscape(title)}</h1>
        <div class="meta">Generated on ${htmlEscape(generatedOn)} &middot; ${rows.length} record${rows.length === 1 ? '' : 's'}</div>
        ${rows.length > 0 ? `
        <table>
          <tr>${headers.map((h) => `<th>${htmlEscape(h)}</th>`).join('')}</tr>
          ${rows.map((row) => `<tr>${row.map((cell) => `<td>${htmlEscape(cell)}</td>`).join('')}</tr>`).join('')}
        </table>
        ` : '<p>No records found.</p>'}
      </body>
    </html>
  `;
}

async function writeAndShareCsv(fileName: string, csv: string): Promise<void> {
  const path = FileSystem.cacheDirectory + fileName;
  await FileSystem.writeAsStringAsync(path, csv, { encoding: FileSystem.EncodingType.UTF8 });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(path, {
      mimeType: 'text/csv',
      UTI: 'public.comma-separated-values-text',
      dialogTitle: fileName,
    });
  }
}

async function shareAsPdf(dialogTitle: string, title: string, headers: string[], rows: unknown[][]): Promise<void> {
  const html = buildPdfHtml(title, headers, rows);
  const { uri } = await Print.printToFileAsync({ html });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      UTI: '.pdf',
      mimeType: 'application/pdf',
      dialogTitle,
    });
  }
}

export default function DataExportScreen() {
  const { showAlert } = useAlert();
  const [loadingKey, setLoadingKey] = useState<string | null>(null);

  const handleExportPatients = async (format: ExportFormat) => {
    const key = `patients-${format}`;
    setLoadingKey(key);
    try {
      const { data, error } = await getPatients('all');
      if (error) throw new Error(error);

      const headers = ['Full Name', 'Phone', 'Age', 'Gender', 'Visit Type', 'Address', 'Status', 'Notes', 'Created At'];
      const rows = data.map((p) => [
        p.full_name,
        p.phone,
        p.age,
        p.gender,
        p.visit_type,
        p.address,
        p.is_active ? 'Active' : 'Inactive',
        p.notes,
        p.created_at,
      ]);

      if (format === 'csv') {
        await writeAndShareCsv('patients.csv', toCsv(headers, rows));
      } else {
        await shareAsPdf('Patients Export', 'Patients Export', headers, rows);
      }
    } catch (err: any) {
      showAlert('Export Failed', err?.message || 'Could not export patients.');
    } finally {
      setLoadingKey(null);
    }
  };

  const handleExportPayments = async (format: ExportFormat) => {
    const key = `payments-${format}`;
    setLoadingKey(key);
    try {
      const { data, error } = await getPayments(0, EXPORT_PAGE_SIZE);
      if (error) throw new Error(error);

      const headers = ['Patient', 'Amount', 'Type', 'Method', 'Status', 'Payment Date', 'Notes'];
      const rows = data.map((p) => [
        p.patient?.full_name ?? '',
        p.amount,
        p.payment_type,
        p.payment_method,
        p.status,
        p.payment_date,
        p.notes,
      ]);

      if (format === 'csv') {
        await writeAndShareCsv('payments.csv', toCsv(headers, rows));
      } else {
        await shareAsPdf('Payments Export', 'Payments Export', headers, rows);
      }
    } catch (err: any) {
      showAlert('Export Failed', err?.message || 'Could not export payments.');
    } finally {
      setLoadingKey(null);
    }
  };

  const handleExportAttendance = async (format: ExportFormat) => {
    const key = `attendance-${format}`;
    setLoadingKey(key);
    try {
      const { data, error } = await getAttendances(undefined, 0, EXPORT_PAGE_SIZE);
      if (error) throw new Error(error);

      const headers = ['Patient', 'Date', 'Time', 'Notes'];
      const rows = data.map((a) => [
        a.patient?.full_name ?? '',
        a.attendance_date,
        a.attendance_time,
        a.notes,
      ]);

      if (format === 'csv') {
        await writeAndShareCsv('attendance.csv', toCsv(headers, rows));
      } else {
        await shareAsPdf('Attendance Export', 'Attendance Export', headers, rows);
      }
    } catch (err: any) {
      showAlert('Export Failed', err?.message || 'Could not export attendance.');
    } finally {
      setLoadingKey(null);
    }
  };

  const exportItems: { kind: ExportKind; icon: keyof typeof Ionicons.glyphMap; label: string; subtitle: string; onExport: (format: ExportFormat) => void }[] = [
    {
      kind: 'patients',
      icon: 'people-outline',
      label: 'Export Patients',
      subtitle: 'All patient records',
      onExport: handleExportPatients,
    },
    {
      kind: 'payments',
      icon: 'cash-outline',
      label: 'Export Payments',
      subtitle: 'All payment transactions',
      onExport: handleExportPayments,
    },
    {
      kind: 'attendance',
      icon: 'calendar-outline',
      label: 'Export Attendance',
      subtitle: 'All attendance records',
      onExport: handleExportAttendance,
    },
  ];

  return (
    <KeyboardAwareScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.sectionHint}>
        Export your data as a CSV file for spreadsheets, or a PDF file for sharing and printing.
      </Text>

      <View style={[styles.card, Shadows.sm]}>
        {exportItems.map((item, index) => {
          const csvKey = `${item.kind}-csv`;
          const pdfKey = `${item.kind}-pdf`;
          const isCsvLoading = loadingKey === csvKey;
          const isPdfLoading = loadingKey === pdfKey;
          const isAnyLoading = loadingKey !== null;

          return (
            <React.Fragment key={item.kind}>
              {index > 0 && <View style={styles.divider} />}
              <View style={styles.row}>
                <View style={styles.rowIconBg}>
                  <Ionicons name={item.icon} size={20} color={Colors.primary} />
                </View>
                <View style={styles.rowTextContainer}>
                  <Text style={styles.rowLabel}>{item.label}</Text>
                  <Text style={styles.rowSubtitle}>{item.subtitle}</Text>
                </View>
                <View style={styles.formatButtons}>
                  <TouchableOpacity
                    style={styles.formatButton}
                    onPress={() => item.onExport('csv')}
                    disabled={isAnyLoading}
                    activeOpacity={0.6}
                  >
                    {isCsvLoading ? (
                      <ActivityIndicator size="small" color={Colors.primary} />
                    ) : (
                      <Text style={[styles.formatButtonText, isAnyLoading && styles.formatButtonTextDisabled]}>CSV</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.formatButton}
                    onPress={() => item.onExport('pdf')}
                    disabled={isAnyLoading}
                    activeOpacity={0.6}
                  >
                    {isPdfLoading ? (
                      <ActivityIndicator size="small" color={Colors.primary} />
                    ) : (
                      <Text style={[styles.formatButtonText, isAnyLoading && styles.formatButtonTextDisabled]}>PDF</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </React.Fragment>
          );
        })}
      </View>
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.base,
    paddingBottom: Spacing['3xl'],
  },
  sectionHint: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
    lineHeight: Typography.sm * Typography.relaxed,
  },
  card: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md + 2,
    paddingHorizontal: Spacing.base,
  },
  rowIconBg: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primaryFaded,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  rowTextContainer: {
    flex: 1,
  },
  rowLabel: {
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
    color: Colors.text,
  },
  rowSubtitle: {
    fontSize: Typography.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  formatButtons: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  formatButton: {
    minWidth: 44,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formatButtonText: {
    fontSize: Typography.xs,
    fontWeight: Typography.semibold,
    color: Colors.primary,
  },
  formatButtonTextDisabled: {
    color: Colors.textTertiary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginLeft: Spacing.base + 40 + Spacing.md,
  },
});
