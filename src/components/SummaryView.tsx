import React, { useMemo, useState } from 'react';
import { Banknote, Eye, QrCode, Receipt, Search, TrendingUp } from 'lucide-react';
import type { OrderRecord, PaymentMethod } from '../types/pos';

interface SummaryViewProps {
  orders: OrderRecord[];
  onViewReceipt: (order: OrderRecord) => void;
}

export const SummaryView: React.FC<SummaryViewProps> = ({ orders, onViewReceipt }) => {
  const [methodFilter, setMethodFilter] = useState<'ALL' | PaymentMethod>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const metrics = useMemo(() => {
    let totalSales = 0;
    let cashSales = 0;
    let promptPaySales = 0;

    for (const order of orders) {
      totalSales += Number(order.total) || 0;
      if (order.paymentMethod === 'Cash') {
        cashSales += Number(order.total) || 0;
      } else {
        promptPaySales += Number(order.total) || 0;
      }
    }

    return {
      totalSales,
      orderCount: orders.length,
      cashSales,
      promptPaySales,
    };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return orders.filter((order) => {
      const matchMethod = methodFilter === 'ALL' || order.paymentMethod === methodFilter;
      const matchQuery =
        !q ||
        order.receiptNo.toLowerCase().includes(q) ||
        order.itemsSummary.toLowerCase().includes(q) ||
        order.staffName.toLowerCase().includes(q);
      return matchMethod && matchQuery;
    });
  }, [orders, methodFilter, searchTerm]);

  return (
    <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 space-y-6">
      {/* KPI Strip */}
      <section aria-label="สรุปยอดขาย" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="pos-card rounded-3xl border shadow-[0_6px_22px_rgba(15,23,42,0.06)] p-5">
          <div className="flex items-center justify-between text-xs font-semibold pos-muted">
            <span>ยอดขายรวม</span>
            <TrendingUp className="w-4 h-4 pos-accent-text" />
          </div>
          <div className="mt-2 text-2xl font-bold pos-ink font-mono-tabular">
            ฿{metrics.totalSales.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div className="pos-card rounded-3xl border shadow-[0_6px_22px_rgba(15,23,42,0.06)] p-5">
          <div className="flex items-center justify-between text-xs font-semibold pos-muted">
            <span>จำนวนออเดอร์</span>
            <Receipt className="w-4 h-4 pos-accent-text" />
          </div>
          <div className="mt-2 text-2xl font-bold pos-ink font-mono-tabular">
            {metrics.orderCount.toLocaleString('th-TH')} รายการ
          </div>
        </div>

        <div className="pos-card rounded-3xl border shadow-[0_6px_22px_rgba(15,23,42,0.06)] p-5">
          <div className="flex items-center justify-between text-xs font-semibold pos-muted">
            <span>ยอดชำระเงินสด</span>
            <Banknote className="w-4 h-4 text-[#22a06b]" />
          </div>
          <div className="mt-2 text-2xl font-bold pos-ink font-mono-tabular">
            ฿{metrics.cashSales.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div className="pos-card rounded-3xl border shadow-[0_6px_22px_rgba(15,23,42,0.06)] p-5">
          <div className="flex items-center justify-between text-xs font-semibold pos-muted">
            <span>ยอดพร้อมเพย์ (QR)</span>
            <QrCode className="w-4 h-4 pos-accent-text" />
          </div>
          <div className="mt-2 text-2xl font-bold pos-ink font-mono-tabular">
            ฿{metrics.promptPaySales.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
          </div>
        </div>
      </section>

      {/* Transactions Table */}
      <section className="pos-card rounded-3xl border shadow-[0_8px_28px_rgba(15,23,42,0.06)] p-5 sm:p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
          <div>
            <h1 className="text-xl font-bold pos-ink">ประวัติการขาย (9 คอลัมน์ A–I)</h1>
            <p className="text-xs pos-muted mt-0.5">
              ข้อมูลเรียงลำดับคอลัมน์ตรงตามโครงสร้าง Google Sheets
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 pos-nav-shell p-1 rounded-xl border">
              {(['ALL', 'Cash', 'PromptPay'] as const).map((method) => {
                const active = methodFilter === method;
                const label = method === 'ALL' ? 'ทั้งหมด' : method;
                return (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setMethodFilter(method)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                      active
                        ? 'pos-card pos-accent-text shadow-xs'
                        : 'pos-muted hover:opacity-85'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            <div className="relative w-full sm:w-60">
              <Search className="w-4 h-4 pos-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                aria-label="ค้นหาประวัติใบเสร็จ"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ค้นหาเลขใบเสร็จ, พนักงาน..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border pos-input text-xs focus:outline-none focus:ring-2 focus:ring-[var(--pos-accent)]/40"
              />
            </div>
          </div>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="py-12 text-center text-sm pos-muted pos-surface-soft rounded-2xl border border-dashed">
            ไม่พบรายการขายตามเงื่อนไขที่เลือก
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b pos-border pos-muted">
                  <th className="py-3 px-2.5 font-semibold whitespace-nowrap">เวลา (GMT+7)</th>
                  <th className="py-3 px-2.5 font-semibold whitespace-nowrap">เลขที่ใบเสร็จ</th>
                  <th className="py-3 px-2.5 font-semibold">รายการสินค้า</th>
                  <th className="py-3 px-2.5 font-semibold text-right whitespace-nowrap">ยอดรวม</th>
                  <th className="py-3 px-2.5 font-semibold text-right whitespace-nowrap">รับเงิน</th>
                  <th className="py-3 px-2.5 font-semibold text-right whitespace-nowrap">เงินทอน</th>
                  <th className="py-3 px-2.5 font-semibold whitespace-nowrap">วิธีชำระ</th>
                  <th className="py-3 px-2.5 font-semibold whitespace-nowrap">พนักงาน</th>
                  <th className="py-3 px-2.5 font-semibold text-center whitespace-nowrap">ใบเสร็จ</th>
                </tr>
              </thead>
              <tbody className="divide-y pos-border">
                {filteredOrders.map((order) => (
                  <tr key={order.receiptNo} className="hover:opacity-90 transition-colors">
                    <td className="py-3 px-2.5 font-mono-tabular pos-muted whitespace-nowrap">
                      {order.timestamp}
                    </td>
                    <td className="py-3 px-2.5 font-mono-tabular font-semibold pos-ink whitespace-nowrap">
                      {order.receiptNo}
                    </td>
                    <td className="py-3 px-2.5 pos-ink max-w-xs truncate">
                      {order.itemsSummary}
                    </td>
                    <td className="py-3 px-2.5 text-right font-mono-tabular font-bold pos-ink whitespace-nowrap">
                      ฿{order.total.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-2.5 text-right font-mono-tabular pos-muted whitespace-nowrap">
                      ฿{order.received.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-2.5 text-right font-mono-tabular pos-muted whitespace-nowrap">
                      ฿{order.change.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-2.5 whitespace-nowrap">
                      <span className="font-semibold pos-accent-text">{order.paymentMethod}</span>
                    </td>
                    <td className="py-3 px-2.5 pos-ink whitespace-nowrap">
                      {order.staffName}
                    </td>
                    <td className="py-3 px-2.5 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onViewReceipt(order)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg pos-btn-secondary border font-semibold cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>ดูใบเสร็จ</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
};
