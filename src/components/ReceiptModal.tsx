import React, { useEffect, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { CheckCircle2, Download, ExternalLink, Printer, X } from 'lucide-react';
import type { OrderRecord, ShopSettings } from '../types/pos';
import { toBase64DataUrl, waitForImagesReady } from '../utils/imageLoader';

interface ReceiptModalProps {
  order: OrderRecord | null;
  settings: ShopSettings;
  logoDataUrl: string;
  syncMessage: string;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  order,
  settings,
  logoDataUrl,
  syncMessage,
  onClose,
}) => {
  const receiptRef = useRef<HTMLDivElement | null>(null);
  const [resolvedLogo, setResolvedLogo] = useState<string>(logoDataUrl);
  const [logoError, setLogoError] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let active = true;
    setLogoError(false);
    if (logoDataUrl) {
      setResolvedLogo(logoDataUrl);
      return;
    }
    if (settings.logoUrl) {
      toBase64DataUrl(settings.logoUrl).then((dataUrl) => {
        if (active) setResolvedLogo(dataUrl);
      });
    }
    return () => {
      active = false;
    };
  }, [logoDataUrl, settings.logoUrl, order?.receiptNo]);

  if (!order) return null;

  const handleDownloadPng = async () => {
    if (!receiptRef.current || exporting) return;
    setExporting(true);
    try {
      await waitForImagesReady(receiptRef.current);
      const canvas = await html2canvas(receiptRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
      });
      const link = document.createElement('a');
      link.download = `${order.receiptNo}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } finally {
      setExporting(false);
    }
  };

  const handlePrint = async () => {
    await waitForImagesReady(receiptRef.current);
    window.print();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="ใบเสร็จรับเงิน"
      className="fixed inset-0 z-50 bg-[#1e3554]/45 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
    >
      <div className="w-full max-w-md pos-card rounded-3xl border shadow-2xl p-5 my-auto">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-[#1c8a5b] font-bold text-sm">
            <CheckCircle2 className="w-5 h-5" />
            <span>ชำระเงินสำเร็จ</span>
          </div>
          <button
            type="button"
            aria-label="ปิดหน้าต่างใบเสร็จ"
            onClick={onClose}
            className="w-8 h-8 rounded-xl pos-surface-soft border flex items-center justify-center pos-muted hover:opacity-80 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {syncMessage && (
          <div className="mb-3 rounded-xl pos-surface-soft border px-3 py-2 text-xs pos-muted flex items-center justify-between gap-2">
            <span>{syncMessage}</span>
            {order.receiptDriveUrl && (
              <a
                href={order.receiptDriveUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 pos-accent-text font-semibold shrink-0 hover:underline"
              >
                <span>Drive</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        )}

        {/* Printable & Exportable Receipt Surface (always crisp white paper) */}
        <div
          id="receipt-print-area"
          ref={receiptRef}
          className="bg-white rounded-2xl border border-[#e3ecf8] p-6 text-[#1e3554]"
        >
          <div className="flex flex-col items-center text-center pb-4 border-b border-dashed border-[#cbd9ec]">
            {resolvedLogo && !logoError && (
              <div className="w-16 h-16 rounded-2xl overflow-hidden border border-[#e3ecf8] mb-2.5 bg-white flex items-center justify-center">
                <img
                  src={resolvedLogo}
                  alt={settings.shopName}
                  crossOrigin="anonymous"
                  referrerPolicy="no-referrer"
                  onError={() => setLogoError(true)}
                  className="w-full h-full object-contain"
                />
              </div>
            )}
            <h2 className="text-lg font-bold text-[#1e3554]">{settings.shopName}</h2>
            {settings.shopTagline && (
              <p className="text-[11px] text-[#647b99] mt-0.5">{settings.shopTagline}</p>
            )}
          </div>

          <div className="py-3 text-xs space-y-1 border-b border-dashed border-[#cbd9ec]">
            <div className="flex justify-between">
              <span className="text-[#647b99]">เลขที่ใบเสร็จ</span>
              <span className="font-mono-tabular font-semibold">{order.receiptNo}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#647b99]">วันที่/เวลา</span>
              <span className="font-mono-tabular">{order.timestamp}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#647b99]">พนักงานขาย</span>
              <span className="font-semibold">{order.staffName}</span>
            </div>
          </div>

          <div className="py-3 space-y-2 border-b border-dashed border-[#cbd9ec] text-xs">
            {order.itemsDetail.map((line, idx) => (
              <div key={`${line.name}-${idx}`} className="flex justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-[#1e3554]">{line.name}</div>
                  <div className="text-[11px] text-[#647b99] font-mono-tabular">
                    {line.qty} × ฿{line.price.toLocaleString('th-TH')}
                  </div>
                </div>
                <div className="font-mono-tabular font-semibold shrink-0">
                  ฿{(line.qty * line.price).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                </div>
              </div>
            ))}
          </div>

          <div className="pt-3 space-y-1.5 text-xs">
            <div className="flex justify-between text-base font-bold text-[#1e3554]">
              <span>ยอดสุทธิ</span>
              <span className="font-mono-tabular">
                ฿{order.total.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between text-[#647b99]">
              <span>วิธีชำระเงิน</span>
              <span className="font-semibold text-[#1e3554]">{order.paymentMethod}</span>
            </div>
            <div className="flex justify-between text-[#647b99]">
              <span>รับเงิน</span>
              <span className="font-mono-tabular">
                ฿{order.received.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between text-[#647b99]">
              <span>เงินทอน</span>
              <span className="font-mono-tabular">
                ฿{order.change.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {settings.receiptNote && (
            <p className="mt-4 pt-3 border-t border-dashed border-[#cbd9ec] text-center text-[11px] text-[#647b99]">
              {settings.receiptNote}
            </p>
          )}
        </div>

        {/* Modal Actions */}
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <button
            type="button"
            disabled={exporting}
            onClick={handleDownloadPng}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl pos-btn-secondary border text-sm font-semibold cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>{exporting ? 'กำลังสร้างรูป...' : 'บันทึก PNG'}</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl pos-btn-primary text-sm font-semibold cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>พิมพ์ใบเสร็จ</span>
          </button>
        </div>
      </div>
    </div>
  );
};
