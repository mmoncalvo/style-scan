import React, { useState } from 'react';
import { SkinAnalysis, Product } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Activity, User, Droplets, Sparkles, AlertCircle, ShoppingBag, X, Clock } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';

interface AnalysisResultProps {
  result: SkinAnalysis;
  allProducts: Product[];
}

export const AnalysisResult: React.FC<AnalysisResultProps> = ({ result, allProducts }) => {
  const [activeLayer, setActiveLayer] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);

  React.useEffect(() => {
    if (selectedProduct) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [selectedProduct]);

  const metrics = [
    { label: 'Puntos', type: 'age_spot', targetKey: 'spots', value: result.spots, icon: Activity },
    { label: 'Arrugas', type: 'wrinkle', targetKey: 'wrinkles', value: result.wrinkles, icon: Activity },
    { label: 'Textura', type: 'texture', targetKey: 'texture', value: result.texture, icon: Activity },
    { label: 'Ojeras', type: 'dark_circle_v2', targetKey: 'darkCircles', value: result.darkCircles, icon: Activity },
    { label: 'Poros', type: 'pore', targetKey: 'pores', value: result.pores, icon: Activity },
    { label: 'Enrojecimiento', type: 'redness', targetKey: 'redness', value: result.redness, icon: Activity },
    { label: 'Grasitud', type: 'oiliness', targetKey: 'oiliness', value: result.oiliness, icon: Activity },
    { label: 'Humedad', type: 'moisture', targetKey: 'moisture', value: result.moisture, icon: Droplets },
    { label: 'Bolsas', type: 'eye_bag', targetKey: 'eyebag', value: result.eyebag, icon: Activity },
    { label: 'Párpado Caído', type: 'droopy_upper_eyelid', targetKey: 'droopyEyelid', value: result.droopyEyelid, icon: Activity },
    { label: 'Acné', type: 'acne', targetKey: 'acne', value: result.acne, icon: AlertCircle },
  ];

  const recommendations = React.useMemo(() => {
    const matches = allProducts.filter(product => {
      const metric = metrics.find(m => m.targetKey === product.target);
      if (!metric) return false;
      const diff = Math.abs(metric.value - (product.range || 0));
      return diff <= 30;
    })
      .sort((a, b) => {
        const diffA = Math.abs((metrics.find(m => m.targetKey === a.target)?.value || 0) - (a.range || 0));
        const diffB = Math.abs((metrics.find(m => m.targetKey === b.target)?.value || 0) - (b.range || 0));
        return diffA - diffB;
      });
    return matches.length > 0 ? matches.slice(0, 6) : allProducts.slice(0, 6);
  }, [allProducts, metrics]);

  const handleDownloadPDF = async () => {
    const doc = new jsPDF();
    const primaryColor = [11, 92, 102];
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('REPORTE DE ANÁLISIS FACIAL', 105, 25, { align: 'center' });

    let summaryStartY = 50;
    try {
      const img = await fetch(result.imageUrl);
      const blob = await img.blob();
      const reader = new FileReader();
      const imageData = await new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
      const imgProps = doc.getImageProperties(imageData);
      const pdfWidth = 80;
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      doc.addImage(imageData, 'JPEG', (210 - pdfWidth) / 2, 45, pdfWidth, pdfHeight);
      summaryStartY = 45 + pdfHeight + 10;
    } catch (e) {
      console.error("Could not add image to PDF", e);
    }
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Resumen General', 20, summaryStartY);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 20, summaryStartY + 10);
    doc.text(`Puntuación de Piel (Skin Score): ${Math.round(result.skinScore)}/100`, 20, summaryStartY + 17);
    doc.text(`Edad Biológica Estimada: ${result.skinAge} años`, 20, summaryStartY + 24);
    doc.text(`Tipo de Piel: ${result.skinType}`, 20, summaryStartY + 31);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Detalle de Biomarcadores', 20, summaryStartY + 45);
    const tableData = metrics.map(m => [m.label, `${m.value}%`]);
    autoTable(doc, {
      startY: summaryStartY + 50,
      head: [['Parámetro', 'Valor']],
      body: tableData,
      headStyles: { fillColor: primaryColor as [number, number, number] },
      margin: { left: 20, right: 20 }
    });
    const finalY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Recomendaciones Personalizadas', 20, finalY);
    const recTableData = recommendations.map(p => [
      p.title,
      metrics.find(m => m.targetKey === p.target)?.label || 'Tratamiento',
      `$${p.price.toFixed(2)}`
    ]);
    autoTable(doc, {
      startY: finalY + 5,
      head: [['Producto', 'Objetivo', 'Precio']],
      body: recTableData,
      headStyles: { fillColor: primaryColor as [number, number, number] },
      styles: { fontSize: 10 },
      margin: { left: 20, right: 20 }
    });
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text('Powered by Derma AI - Skin Analysis Studio', 105, 285, { align: 'center' });
    doc.save(`DermaAI_Reporte_${result.id.substring(0, 8)}.pdf`);
    toast.success('Reporte PDF generado correctamente');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-7xl mx-auto"
    >
      {result.isMock && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 flex items-center gap-3"
        >
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">
            Estos son datos de ejemplo. La API no está configurada para realizar análisis reales.
          </p>
        </motion.div>
      )}
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="w-full lg:w-[35%] flex flex-col gap-6">
          <div className="bg-[#F3F4F6] dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-slate-800 flex flex-col items-center transition-colors duration-300">
            <div className="bg-[#0B5C66] w-full rounded-2xl flex flex-col items-center justify-center py-10 shadow-md">
              <div className="w-40 h-40 bg-white dark:bg-slate-800 rounded-full flex flex-col items-center justify-center shadow-lg relative transition-colors duration-300">
                <svg className="absolute inset-0 w-full h-full -rotate-90">
                  <circle cx="80" cy="80" r="76" stroke="#E5E7EB" strokeWidth="8" fill="none" className="dark:stroke-slate-700" />
                  <circle cx="80" cy="80" r="76" stroke="#0B5C66" strokeWidth="8" fill="none" strokeDasharray="477" strokeDashoffset={477 - (477 * result.skinScore) / 100} className="dark:stroke-teal-400" />
                </svg>
                <span className="text-5xl font-black text-slate-900 dark:text-white leading-none">{Math.round(result.skinScore)}<span className="text-xl">.{(result.skinScore % 1 * 10).toFixed(0)}</span></span>
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-1">Skin Score</span>
              </div>
            </div>
            <div className="mt-8 text-center px-2">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">Estado General</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-6">
                Su piel muestra una salud general estable, aunque se detectan áreas de mejora en texturas según los biomarcadores. Edad biológica estimada: <span className="font-semibold text-slate-700 dark:text-slate-300">{result.skinAge} años</span>.
              </p>
              <button
                onClick={handleDownloadPDF}
                className="w-full py-4 px-6 bg-[#0B5C66] hover:bg-[#094A52] dark:bg-teal-600 dark:hover:bg-teal-700 text-white text-sm font-bold tracking-widest uppercase rounded-xl transition-colors shadow-md"
              >
                Descargar Reporte PDF
              </button>            </div>
          </div>
          <div className="bg-slate-900 rounded-3xl overflow-hidden shadow-md relative aspect-square group">
            <img
              src={result.masks?.['resize_image'] || result.imageUrl}
              alt="Analyzed Base"
              className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
            />
            {activeLayer && result.masks?.[activeLayer] && (
              <img
                src={result.masks[activeLayer]}
                alt={`${activeLayer} Mask`}
                className="absolute inset-0 w-full h-full object-cover mix-blend-normal opacity-90 transition-opacity duration-300"
              />
            )}
            <div className="absolute bottom-4 left-4 right-4 flex items-center gap-2 text-white bg-black/40 backdrop-blur-md px-3 py-2 rounded-lg text-xs font-bold tracking-wide">
              <Clock className="w-4 h-4" />
              ESCANEO HACE 2 MINUTOS
            </div>
          </div>
        </div>
        <div className="w-full lg:w-[65%] flex flex-col gap-10">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-sm border border-gray-100 dark:border-slate-800 transition-colors duration-300">
            <div className="mb-8 border-b-2 border-gray-100 dark:border-slate-800 pb-4 inline-block">
              <h2 className="text-2xl font-bold text-[#0B5C66] dark:text-teal-400">Métricas Detalladas</h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Análisis multiespectral mediante IA avanzada.</p>
            </div>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-12">
              {metrics.map((metric, idx) => (
                <motion.div
                  key={metric.label}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => setActiveLayer(activeLayer === metric.type ? null : metric.type)}
                  className="cursor-pointer flex flex-col items-center text-center transition-all duration-200 group"
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 transition-colors ${activeLayer === metric.type ? 'bg-[#0B5C66] dark:bg-teal-500 shadow-md' : 'bg-teal-50 dark:bg-teal-900/20 group-hover:bg-teal-100 dark:group-hover:bg-teal-900/40'}`}>
                    <metric.icon className={`w-5 h-5 ${activeLayer === metric.type ? 'text-white' : 'text-[#0B5C66] dark:text-teal-400'}`} />
                  </div>
                  <div className="text-xl font-black text-slate-800 dark:text-white mb-1">{typeof metric.value === 'number' && metric.value > 10 ? `${metric.value}%` : metric.value}</div>
                  <div className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest leading-tight">{metric.label}</div>
                </motion.div>
              ))}
            </div>
          </div>
          <div className="bg-transparent">
            <div className="flex items-center gap-4 mb-6">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Recomendaciones Curadas</h2>
              <span className="bg-teal-100 dark:bg-teal-900/30 text-[#0B5C66] dark:text-teal-400 text-[10px] font-bold px-3 py-1 rounded-full tracking-widest uppercase">Para Ti</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {recommendations.map(product => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all border border-gray-100 dark:border-slate-800 flex flex-col cursor-pointer group"
                  onClick={() => setSelectedProduct(product)}
                >
                  <div className="aspect-[4/3] bg-gray-50 dark:bg-slate-800 relative overflow-hidden flex items-center justify-center p-4">
                    <img src={product.images?.[0]} alt={product.title} className="w-full h-full object-cover rounded-lg group-hover:scale-105 transition-transform duration-500" />
                  </div>
                  <div className="p-5 flex flex-col flex-grow">
                    <div className="text-[10px] font-bold text-[#0B5C66] dark:text-teal-400 tracking-widest uppercase mb-2">{product.target}</div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-tight mb-4 flex-grow">{product.title}</h4>
                    <div className="flex items-center justify-between mt-auto">
                      <span className="font-bold text-slate-900 dark:text-white">${product.price.toFixed(2)}</span>
                      <button className="w-8 h-8 rounded-full bg-[#0B5C66] dark:bg-teal-600 text-white flex items-center justify-center shadow-md hover:bg-[#094A52] dark:hover:bg-teal-700 transition-colors">
                        <span className="text-lg font-light leading-none mb-0.5">+</span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <AnimatePresence>
        {selectedProduct && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-sm"
              onClick={() => setSelectedProduct(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-2xl z-10 flex flex-col md:flex-row max-h-[90vh] transition-colors duration-300"
            >
              <button
                onClick={() => setSelectedProduct(null)}
                className="absolute top-4 right-4 z-20 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full backdrop-blur-md transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="w-full md:w-1/2 bg-gray-100 dark:bg-slate-800 flex items-center justify-center">
                <img src={selectedProduct.images?.[0]} alt={selectedProduct.title} className="w-full h-full object-cover" />
              </div>
              <div className="w-full md:w-1/2 p-8 overflow-y-auto flex flex-col">
                <div className="mb-6">
                  <div className="text-xs text-[#0B5C66] dark:text-teal-400 font-bold mb-2 uppercase tracking-widest">{selectedProduct.target}</div>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white leading-tight mb-2">{selectedProduct.title}</h3>
                  <div className="text-xl font-bold text-slate-900 dark:text-white">${selectedProduct.price.toFixed(2)}</div>
                </div>
                <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-8 flex-grow">
                  {selectedProduct.description}
                </p>
                <div className="border-t border-gray-100 dark:border-slate-800 pt-6 mt-auto">
                  <button className="w-full py-3.5 text-white bg-[#0B5C66] dark:bg-teal-600 hover:bg-[#094A52] dark:hover:bg-teal-700 font-bold tracking-wide uppercase text-sm rounded-xl transition-colors shadow-lg shadow-teal-900/20">
                    Añadir al carrito
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
