import React, { useState } from 'react';
import {
  X,
  SlidersHorizontal,
  Link2,
  Copy,
  Check,
  Code,
  Gauge,
  HelpCircle,
  ExternalLink,
  Save,
  RotateCcw
} from 'lucide-react';
import { GOOGLE_APPS_SCRIPT_SAMPLE, getStoredApiUrl, setStoredApiUrl, getStoredLastKm, setStoredLastKm } from '../services/api';
import { CONFIG } from '../config';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
  showToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onUpdated,
  showToast,
}) => {
  if (!isOpen) return null;

  const [apiUrl, setApiUrl] = useState(getStoredApiUrl());
  const [kmVal, setKmVal] = useState(getStoredLastKm().toString());
  const [copiedCode, setCopiedCode] = useState(false);
  const [activeTab, setActiveTab] = useState<'settings' | 'script'>('settings');

  const handleSave = () => {
    setStoredApiUrl(apiUrl);
    const parsed = parseInt(kmVal, 10);
    if (!isNaN(parsed) && parsed > 0) {
      setStoredLastKm(parsed);
    }
    showToast('Настройките са запазени успешно! ✨', 'success');
    onUpdated();
    onClose();
  };

  const handleResetToDefault = () => {
    setApiUrl(CONFIG.DEFAULT_API_URL);
    setKmVal(CONFIG.VEHICLE.initialKm.toString());
  };

  const copyScriptCode = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_SAMPLE);
    setCopiedCode(true);
    showToast('Кодът за Google Apps Script е копиран! 📋', 'info');
    setTimeout(() => setCopiedCode(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-lg bg-white/95 backdrop-blur-xl border border-white/80 rounded-t-3xl sm:rounded-3xl shadow-chic-hover max-h-[90vh] flex flex-col overflow-hidden transition-all duration-300 animate-slide-up"
        role="dialog"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-rose-100 flex items-center justify-between bg-gradient-to-r from-rose-50/70 to-pink-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-500 flex items-center justify-center shadow-inner">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                Конфигурация на приложението
              </h3>
              <p className="text-xs text-slate-400">
                Google Таблица, Apps Script и километраж
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/80 hover:bg-white text-slate-400 hover:text-slate-600 flex items-center justify-center border border-slate-200/60 touch-bouncy shadow-sm"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-100 px-5 pt-2 bg-slate-50/50">
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'settings'
                ? 'border-rose-500 text-rose-600'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <Link2 className="w-3.5 h-3.5" />
            <span>Връзка с Google Sheets</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('script')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'script'
                ? 'border-rose-500 text-rose-600'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            <span>Google Apps Script Код</span>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {activeTab === 'settings' ? (
            <>
              {/* Google Apps Script Web App URL */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Link2 className="w-3.5 h-3.5 text-rose-500" />
                  <span>Google Apps Script Web App URL</span>
                </label>
                <div className="relative">
                  <textarea
                    rows={2}
                    value={apiUrl}
                    onChange={(e) => setApiUrl(e.target.value)}
                    placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                    className="w-full bg-white border border-slate-200 rounded-2xl p-3 text-xs font-mono text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-200"
                  />
                </div>
                <p className="text-[11px] text-slate-400 leading-tight">
                  Постави тук Web App адреса, получен след Deploy в Google Sheets &gt; Apps Script.
                </p>
              </div>

              {/* Adjust Initial Odometer */}
              <div className="space-y-1.5 pt-2">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Gauge className="w-3.5 h-3.5 text-amber-500" />
                  <span>Базов / Текущ километраж (за Taigo)</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={kmVal}
                    onChange={(e) => setKmVal(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-2xl px-3 py-2 text-sm font-bold font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-200"
                  />
                  <span className="text-xs font-bold text-slate-400">км</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Това число се използва като начален километраж при липса на предходен запис.
                </p>
              </div>

              {/* Quick instructions guide */}
              <div className="bg-rose-50/70 border border-rose-100 rounded-2xl p-3.5 text-xs text-rose-800 space-y-1.5">
                <div className="font-bold flex items-center gap-1">
                  <HelpCircle className="w-3.5 h-3.5 text-rose-500" />
                  <span>Как се настройва за 2 минути:</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 text-[11px] text-rose-900/80">
                  <li>Отвори Google Sheets таблицата за пътен лист.</li>
                  <li>Избери <b>Разширения (Extensions) &gt; Apps Script</b>.</li>
                  <li>Постави кода от съседния таб и натисни <b>Deploy &gt; New deployment</b>.</li>
                  <li>Избери тип <b>Web app</b>, изпълнявай като "Me", достъп "Anyone".</li>
                  <li>Копирай Web App URL и го постави в полето по-горе.</li>
                </ol>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleResetToDefault}
                  className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1 font-medium touch-bouncy"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Възстанови първоначалните стойности</span>
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">
                  Код за Google Apps Script (Code.gs)
                </span>
                <button
                  type="button"
                  onClick={copyScriptCode}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-rose-500 text-white shadow-sm hover:bg-rose-600 touch-bouncy"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode ? 'Копирано!' : 'Копирай кода'}</span>
                </button>
              </div>

              <pre className="bg-slate-900 text-slate-100 p-3.5 rounded-2xl text-[11px] font-mono overflow-x-auto max-h-[300px] leading-relaxed">
                <code>{GOOGLE_APPS_SCRIPT_SAMPLE}</code>
              </pre>

              <div className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-200/60 flex items-start gap-2">
                <ExternalLink className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                <span>
                  Този скрипт автоматично създава заглавен ред с форматиране, записва всеки нов курс и връща най-новия километраж при стартиране на приложението!
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {activeTab === 'settings' && (
          <div className="p-4 border-t border-slate-100 bg-slate-50/70 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full text-xs font-bold text-slate-600 hover:bg-slate-200/60 touch-bouncy"
            >
              Отказ
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2.5 rounded-full text-xs font-bold bg-gradient-to-r from-rose-400 via-pink-400 to-rose-400 text-white shadow-md shadow-rose-300/30 touch-bouncy flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Запази настройките</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
