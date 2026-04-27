import React, { useState } from 'react';
import { SkinAnalysis, Product } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Activity, User, Droplets, Sparkles, AlertCircle, ShoppingBag, X, Clock, Download, ChevronLeft, ChevronRight, Activity as ActivityIcon } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';

interface AnalysisResultProps {
  result: SkinAnalysis;
  allProducts: Product[];
}

const targetLabels: Record<string, string> = {
  acne: 'Acné',
  spots: 'Manchas',
  age_spot: 'Manchas',
  wrinkles: 'Arrugas',
  wrinkle: 'Arrugas',
  texture: 'Textura',
  darkCircles: 'Ojeras',
  dark_circle_v2: 'Ojeras',
  pores: 'Poros',
  pore: 'Poros',
  redness: 'Enrojecimiento',
  oiliness: 'Grasitud',
  moisture: 'Humedad',
  eyebag: 'Bolsas',
  eye_bag: 'Bolsas',
  droopyEyelid: 'Párp. Superior',
  droopy_upper_eyelid: 'Párp. Superior',
  droopyLowerEyelid: 'Párp. Inferior',
  droopy_lower_eyelid: 'Párp. Inferior',
  firmness: 'Firmeza',
  radiance: 'Luminosidad',
};

export const AnalysisResult: React.FC<AnalysisResultProps> = ({ result, allProducts }) => {
  const [activeLayer, setActiveLayer] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const carouselRef = React.useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (carouselRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
      setCanScrollLeft(scrollLeft > 10);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  React.useEffect(() => {
    checkScroll();
    const carousel = carouselRef.current;
    if (carousel) {
      carousel.addEventListener('scroll', checkScroll);
      window.addEventListener('resize', checkScroll);
    }
    return () => {
      if (carousel) {
        carousel.removeEventListener('scroll', checkScroll);
      }
      window.removeEventListener('resize', checkScroll);
    };
  }, []);

  const scroll = (direction: 'left' | 'right') => {
    if (carouselRef.current) {
      const scrollAmount = window.innerWidth < 1024 ? 200 : 400;
      carouselRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

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
    { label: 'Párp. Superior', type: 'droopy_upper_eyelid', targetKey: 'droopyEyelid', value: result.droopyEyelid, icon: Activity },
    { label: 'Párp. Inferior', type: 'droopy_lower_eyelid', targetKey: 'droopyLowerEyelid', value: result.droopyLowerEyelid ?? 0, icon: Activity },
    { label: 'Firmeza', type: 'firmness', targetKey: 'firmness', value: result.firmness ?? 0, icon: Activity },
    { label: 'Luminosidad', type: 'radiance', targetKey: 'radiance', value: result.radiance ?? 0, icon: Activity },
    { label: 'Acné', type: 'acne', targetKey: 'acne', value: result.acne, icon: AlertCircle },
  ];

  const recommendations = React.useMemo(() => {
    if (activeLayer) {
      const activeMetric = metrics.find(m => m.type === activeLayer);
      if (activeMetric) {
        return allProducts.filter(p => p.target === activeMetric.targetKey);
      }
    }

    const matches = allProducts.filter(product => {
      const metric = metrics.find(m => m.targetKey === product.target);
      if (!metric) return false;
      const diff = Math.abs(metric.value - (product.range || 0));
      return diff <= 30;
    }).sort((a, b) => {
      const diffA = Math.abs((metrics.find(m => m.targetKey === a.target)?.value || 0) - (a.range || 0));
      const diffB = Math.abs((metrics.find(m => m.targetKey === b.target)?.value || 0) - (b.range || 0));
      return diffA - diffB;
    });
    return matches.length > 0 ? matches : allProducts;
  }, [allProducts, metrics, activeLayer]);

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
      className="max-w-7xl mx-auto space-y-10"
    >
      {result.isMock && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 flex items-center gap-3"
          >
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">
            Estos son datos de ejemplo. La API no está configurada para realizar análisis reales.
          </p>
        </motion.div>
      )}

      {/* Top Section: 40/60 Split */}
      <div className="grid grid-cols-1 lg:grid-cols-[40%_1fr] gap-8">
        {/* Left: General Status (40%) */}
        <div className="bg-[#F3F4F6] dark:bg-slate-900 rounded-lg p-8 shadow-sm border border-gray-100 dark:border-slate-800 flex flex-col items-center justify-center transition-all duration-300">
          <div className="bg-[#0B5C66] w-full rounded-lg flex flex-col items-center justify-center py-12 shadow-xl mb-8">
            <div className="w-48 h-48 bg-white dark:bg-slate-800 rounded-full flex flex-col items-center justify-center shadow-inner relative">
              <svg className="absolute inset-0 w-full h-full -rotate-90">
                <circle 
                  cx="96" 
                  cy="96" 
                  r="90" 
                  stroke="#059669" 
                  strokeWidth="10" 
                  fill="none" 
                  strokeDasharray="565" 
                  strokeDashoffset={565 - (565 * result.skinScore) / 100} 
                  className="transition-all duration-1000 ease-out" 
                />
              </svg>
              <div className="flex flex-col items-center">
                <span className="text-6xl font-black text-slate-900 dark:text-white leading-none">
                  {Math.round(result.skinScore)}
                  <span className="text-2xl opacity-50">.{(result.skinScore % 1 * 10).toFixed(0)}</span>
                </span>
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] mt-2">Skin Score</span>
              </div>
            </div>
          </div>
          
          <div className="text-center space-y-4 max-w-sm">
            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Estado General</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
              Su piel muestra una salud general estable, con una edad biológica estimada de <span className="font-bold text-[#0B5C66] dark:text-teal-400">{result.skinAge} años</span>. Se recomiendan cuidados preventivos según los biomarcadores.
            </p>
            <div className="pt-4">
              <button
                onClick={handleDownloadPDF}
                className="w-full py-4 px-8 bg-[#0B5C66] hover:bg-[#094A52] dark:bg-teal-600 dark:hover:bg-teal-700 text-white text-xs font-black tracking-widest uppercase rounded-lg transition-all shadow-lg hover:shadow-teal-500/20 flex items-center justify-center gap-3 group"
              >
                <Download className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" />
                Descargar Reporte PDF
              </button>
            </div>
          </div>
        </div>

        {/* Right: Analyzed Image (60%) */}
        <div className="bg-slate-900 rounded-lg overflow-hidden shadow-2xl relative aspect-[3/4] lg:aspect-auto group border border-slate-800">
          <img
            src={result.masks?.['resize_image'] || result.imageUrl}
            alt="Analyzed Base"
            className={`absolute inset-0 w-full h-full object-cover transition-all duration-700 ${activeLayer ? 'brightness-[0.6] saturate-[0.8]' : 'brightness-100'}`}
          />
          <AnimatePresence>
            {activeLayer && result.masks?.[activeLayer] && (
              <motion.img
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                src={result.masks[activeLayer]}
                alt={`${activeLayer} Mask`}
                className="absolute inset-0 w-full h-full object-cover mix-blend-normal z-10"
              />
            )}
          </AnimatePresence>
          <div className="absolute top-6 left-6 z-20">
             <div className="bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${activeLayer ? 'bg-teal-400 animate-pulse' : 'bg-white/40'}`} />
                <span className="text-[10px] font-bold text-white uppercase tracking-widest">
                  {activeLayer ? `Visualizando: ${targetLabels[activeLayer] || activeLayer}` : 'Vista Original'}
                </span>
             </div>
          </div>
          <div className="absolute bottom-6 right-6 z-20 flex items-center gap-3 text-white/70 bg-black/40 backdrop-blur-md px-4 py-2 rounded-full text-[10px] font-bold tracking-widest uppercase border border-white/5">
            <Clock className="w-3.5 h-3.5" />
            {new Date(result.createdAt).toLocaleDateString()} - {new Date(result.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>

      {/* Middle Section: Indices Carousel */}
      <div className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Análisis de Biomarcadores</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">Selecciona un índice para ver el mapa térmico y productos específicos.</p>
          </div>
          <div className="hidden lg:flex gap-3">
            <button
              onClick={() => scroll('left')}
              disabled={!canScrollLeft}
              className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all ${canScrollLeft ? 'bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 text-[#0B5C66] shadow-sm hover:bg-gray-50' : 'bg-gray-50 dark:bg-slate-950 border-gray-100 dark:border-slate-900 text-gray-300 dark:text-slate-700 cursor-not-allowed'}`}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => scroll('right')}
              disabled={!canScrollRight}
              className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all ${canScrollRight ? 'bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 text-[#0B5C66] shadow-sm hover:bg-gray-50' : 'bg-gray-50 dark:bg-slate-950 border-gray-100 dark:border-slate-900 text-gray-300 dark:text-slate-700 cursor-not-allowed'}`}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <div className="relative group">
          <div 
            ref={carouselRef}
            className="overflow-x-auto scrollbar-hide flex gap-6 pb-6 px-4 snap-x scroll-smooth justify-start md:justify-center"
          >
            {metrics.map((metric, idx) => (
              <motion.div
                key={metric.label}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => setActiveLayer(activeLayer === metric.type ? null : metric.type)}
                className={`
                  flex-shrink-0 snap-start w-28 p-3 rounded-lg border transition-all duration-300 cursor-pointer text-center flex flex-col items-center justify-center gap-2
                  ${activeLayer === metric.type 
                    ? 'bg-[#0B5C66] border-[#0B5C66] text-white shadow-xl shadow-[#0B5C66]/20' 
                    : 'bg-white dark:bg-slate-900 border-gray-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-teal-200 dark:hover:border-teal-800'}
                `}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${activeLayer === metric.type ? 'bg-white/20' : 'bg-teal-50 dark:bg-teal-900/30'}`}>
                  <metric.icon className={`w-5 h-5 ${activeLayer === metric.type ? 'text-white' : 'text-[#0B5C66] dark:text-teal-400'}`} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-wider mb-1">{metric.label}</span>
                  <span className={`text-lg font-black ${activeLayer === metric.type ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                    {Math.round(metric.value)}%
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Section: Recommended Products (Full Width) */}
      <div className="bg-white dark:bg-slate-900 rounded-lg p-10 border border-gray-100 dark:border-slate-800 shadow-sm transition-all duration-300">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 border-b border-gray-100 dark:border-slate-800 pb-8">
          <div className="space-y-2">
            <div className="flex items-center gap-3 mb-1">
              <ShoppingBag className="w-6 h-6 text-[#0B5C66] dark:text-teal-400" />
              <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">
                {activeLayer ? `Régimen para ${targetLabels[activeLayer] || activeLayer}` : 'Régimen Recomendado'}
              </h2>
            </div>
            <p className="text-slate-500 dark:text-slate-400 font-medium">
              Basado en su perfil dermatológico actual, hemos seleccionado {recommendations.length} productos esenciales.
            </p>
          </div>
          <div className="bg-teal-50 dark:bg-teal-900/30 px-6 py-2.5 rounded-lg flex items-center gap-3 border border-teal-100 dark:border-teal-800 transition-colors">
            <span className="text-[10px] font-black text-[#0B5C66] dark:text-teal-400 uppercase tracking-[0.2em]">Total Productos</span>
            <span className="text-xl font-black text-[#0B5C66] dark:text-teal-400">{recommendations.length}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <AnimatePresence mode="popLayout">
            {recommendations.map(product => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex flex-col group bg-gray-50/50 dark:bg-slate-800/30 rounded-lg p-5 border border-transparent hover:border-teal-200 dark:hover:border-teal-800 hover:bg-white dark:hover:bg-slate-900 transition-all duration-500 hover:shadow-xl"
              >
                <div className="relative aspect-square rounded-lg overflow-hidden mb-5 bg-white dark:bg-slate-800 shadow-sm transition-transform duration-500 group-hover:scale-[1.02]">
                  <img src={product.images?.[0]} alt={product.title} className="w-full h-full object-cover" />
                  <div className="absolute top-3 right-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm">
                    <span className="text-[9px] font-black text-[#0B5C66] dark:text-teal-400 uppercase tracking-widest">
                      USR: {Math.round(metrics.find(m => m.targetKey === product.target)?.value || 0)}%
                    </span>
                  </div>
                </div>
                <div className="space-y-3 flex-grow flex flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-bold text-slate-900 dark:text-white leading-snug group-hover:text-[#0B5C66] dark:group-hover:text-teal-400 transition-colors">{product.title}</h4>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 text-xs line-clamp-2 leading-relaxed">{product.description}</p>
                  <div className="mt-auto pt-4 flex items-center justify-between">
                    <span className="text-lg font-black text-[#0B5C66] dark:text-teal-400">${product.price.toFixed(2)}</span>
                    <button 
                      onClick={() => setSelectedProduct(product)}
                      className="p-2.5 rounded-lg bg-white dark:bg-slate-800 text-[#0B5C66] dark:text-teal-400 border border-gray-100 dark:border-slate-700 hover:bg-[#0B5C66] hover:text-white hover:border-[#0B5C66] transition-all shadow-sm"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {recommendations.length === 0 && (
          <div className="py-20 text-center bg-gray-50 dark:bg-slate-800/50 rounded-lg border border-dashed border-gray-200 dark:border-slate-700 transition-colors">
            <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 dark:text-slate-400 font-medium">No hay productos recomendados para este índice.</p>
          </div>
        )}
      </div>

      {/* Product Detail Modal */}
      <AnimatePresence>
        {selectedProduct && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedProduct(null)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-lg shadow-2xl transition-colors max-h-[85vh] flex flex-col"
            >
              <button
                onClick={() => setSelectedProduct(null)}
                className="absolute top-6 right-6 p-2 rounded-full bg-white/80 dark:bg-slate-800/80 backdrop-blur-md hover:bg-gray-100 dark:hover:bg-slate-700 transition-all z-50 shadow-sm border border-gray-100 dark:border-slate-700"
              >
                <X className="w-6 h-6 text-slate-500 dark:text-slate-400" />
              </button>
              
              <div className="overflow-y-auto no-scrollbar rounded-lg">
                <div className="flex flex-col lg:flex-row">
                  <div className="lg:w-1/2 relative bg-gray-50 dark:bg-slate-800 aspect-square lg:aspect-auto">
                    <img src={selectedProduct.images?.[0]} alt={selectedProduct.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                  </div>
                  <div className="lg:w-1/2 p-10 lg:p-14 flex flex-col justify-center">
                    <div className="mb-8">
                      <span className="text-[10px] font-black text-[#0B5C66] dark:text-teal-400 uppercase tracking-[0.3em] bg-teal-50 dark:bg-teal-900/30 px-3 py-1.5 rounded-lg border border-teal-100 dark:border-teal-800">Producto Recomendado</span>
                      <h3 className="text-3xl font-black text-slate-900 dark:text-white mt-6 mb-4 leading-tight">{selectedProduct.title}</h3>
                      <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-lg">{selectedProduct.description}</p>
                    </div>
                    <div className="space-y-8">
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-black text-[#0B5C66] dark:text-teal-400">${selectedProduct.price.toFixed(2)}</span>
                        <span className="text-slate-400 line-through text-lg font-medium">${(selectedProduct.price * 1.2).toFixed(2)}</span>
                      </div>
                      <button className="w-full py-5 px-8 bg-[#0B5C66] hover:bg-[#094A52] dark:bg-teal-600 dark:hover:bg-teal-700 text-white font-black tracking-widest uppercase rounded-lg transition-all shadow-xl shadow-teal-500/20 transform hover:-translate-y-1">
                        Comprar Ahora
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
