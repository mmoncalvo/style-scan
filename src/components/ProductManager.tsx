import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingBag, Plus, Pencil, Trash2, X, Save, Search, Filter, Image as ImageIcon, Upload, Loader2, AlertCircle } from 'lucide-react';
import { Product } from '../types';

interface ProductManagerProps {
  token: string;
}

const ProductItem = React.memo(({ product, onEdit, onDelete }: { product: Product, onEdit: (p: Product) => void, onDelete: (id: number) => void }) => {
  const targets: Record<string, string> = {
    spots: "Puntos",
    wrinkles: "Arrugas",
    texture: "Textura",
    darkCircles: "Ojeras",
    pores: "Poros",
    redness: "Enrojecimiento",
    oiliness: "Grasitud",
    moisture: "Humedad",
    eyebag: "Bolsas",
    droopyEyelid: "Párp. Superior",
    droopyLowerEyelid: "Párp. Inferior",
    firmness: "Firmeza",
    radiance: "Luminosidad",
    acne: "Acné"
  }
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-3xl p-4 shadow-sm hover:shadow-md transition-all group flex flex-col h-full"
    >
      <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-gray-50 dark:bg-slate-800 mb-4 border border-gray-100 dark:border-slate-800">
        {product.images && product.images.length > 0 ? (
          <img src={product.images[0]} alt={product.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-slate-700">
            <ImageIcon className="w-8 h-8" />
          </div>
        )}
        <div className="absolute top-2 left-2 flex gap-1">
          <span className="px-2 py-1 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm text-[10px] font-black uppercase tracking-widest rounded-lg shadow-sm text-[#0B5C66] dark:text-teal-400">
            {targets[product.target]}
          </span>
        </div>
        <div className="absolute bottom-2 right-2 bg-[#0B5C66] text-white text-xs font-black px-2 py-1 rounded-lg shadow-lg">
          ${product.price.toFixed(2)}
        </div>
      </div>
      
      <div className="flex-grow space-y-1 px-1">
        <h4 className="font-bold text-slate-900 dark:text-white truncate">{product.title}</h4>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed h-8">
          {product.description}
        </p>
      </div>

      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-50 dark:border-slate-800">
        <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tighter">
          Rango: {product.range}
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => onEdit(product)}
            className="p-2 text-slate-400 hover:text-[#0B5C66] hover:bg-[#0B5C66]/10 rounded-xl transition-all"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(product.id)}
            className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
});

ProductItem.displayName = 'ProductItem';

const ProductForm = ({
  initialData,
  isEditing,
  onClose,
  onSave,
  token
}: {
  initialData: Partial<Product>,
  isEditing: boolean,
  onClose: () => void,
  onSave: () => void,
  token: string
}) => {
  const [formData, setFormData] = useState<Partial<Product>>({
    ...initialData,
    range: initialData.range || 0
  });

  const [isUploading, setIsUploading] = useState(false);

  const targetOptions = [
    { value: 'spots', label: 'Puntos' },
    { value: 'wrinkles', label: 'Arrugas' },
    { value: 'texture', label: 'Textura' },
    { value: 'darkCircles', label: 'Ojeras' },
    { value: 'pores', label: 'Poros' },
    { value: 'redness', label: 'Enrojecimiento' },
    { value: 'oiliness', label: 'Grasitud' },
    { value: 'moisture', label: 'Humedad' },
    { value: 'eyebag', label: 'Bolsas' },
    { value: 'droopyEyelid', label: 'Párp. Superior' },
    { value: 'droopyLowerEyelid', label: 'Párp. Inferior' },
    { value: 'firmness', label: 'Firmeza' },
    { value: 'radiance', label: 'Luminosidad' },
    { value: 'acne', label: 'Acné' }
  ];

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const form = new FormData();
    for (let i = 0; i < files.length; i++) {
      form.append('productImages', files[i]);
    }

    try {
      const response = await axios.post('/api/upload-products', form, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        }
      });
      setFormData(prev => ({
        ...prev,
        images: [...(prev.images || []), ...response.data.paths]
      }));
      toast.success('Imágenes subidas correctamente');
    } catch (err) {
      toast.error('Error al subir imágenes');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const removeImage = (index: number) => {
    setFormData(prev => {
      const newImages = [...(prev.images || [])];
      newImages.splice(index, 1);
      return { ...prev, images: newImages };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.images || formData.images.length === 0) {
      toast.error('Debes subir al menos una imagen');
      return;
    }
    try {
      if (isEditing && formData.id) {
        await axios.put(`/api/products/${formData.id}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Producto actualizado correctamente');
      } else {
        await axios.post('/api/products', formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Producto creado correctamente');
      }
      onSave();
    } catch (err) {
      toast.error('Error al guardar producto');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.95 }}
        className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-white/20"
      >
        <div className="p-8 pb-4 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white">{isEditing ? 'Editar Producto' : 'Nuevo Producto'}</h3>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Gestión de catálogo</p>
          </div>
          <button onClick={onClose} className="p-3 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-2xl transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 pt-4 space-y-6 overflow-y-auto no-scrollbar">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Nombre del Producto</label>
              <input
                required
                type="text"
                placeholder="E.g. Serum Facial Hidratante"
                value={formData.title || ''}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-5 py-3.5 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-teal-500/10 focus:border-[#0B5C66] outline-none transition-all dark:text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Objetivo</label>
                <select
                  value={formData.target || 'spots'}
                  onChange={(e) => setFormData({ ...formData, target: e.target.value })}
                  className="w-full px-5 py-3.5 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-teal-500/10 focus:border-[#0B5C66] outline-none transition-all dark:text-white appearance-none"
                >
                  {targetOptions.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Precio ($)</label>
                <input
                  required
                  type="number"
                  step="0.01"
                  value={formData.price || ''}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                  className="w-full px-5 py-3.5 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-teal-500/10 focus:border-[#0B5C66] outline-none transition-all dark:text-white"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center ml-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Rango de Aplicación</label>
                <span className="text-sm font-black text-[#0B5C66] dark:text-teal-400">{formData.range || 0}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="10"
                value={formData.range || 0}
                onChange={(e) => setFormData({ ...formData, range: parseInt(e.target.value) })}
                className="w-full h-2 bg-gray-100 dark:bg-slate-800 rounded-full appearance-none cursor-pointer accent-[#0B5C66]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Descripción</label>
              <textarea
                required
                rows={3}
                placeholder="Describe los beneficios del producto..."
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-5 py-3.5 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-teal-500/10 focus:border-[#0B5C66] outline-none transition-all dark:text-white resize-none"
              />
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Galería de Imágenes</label>
              
              <div className="grid grid-cols-4 gap-3">
                <label className={`aspect-square flex flex-col items-center justify-center border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-2xl cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 transition-all ${isUploading ? 'opacity-50' : ''}`}>
                  <input type="file" multiple accept="image/*" onChange={handleFileUpload} className="hidden" disabled={isUploading} />
                  {isUploading ? <Loader2 className="w-5 h-5 animate-spin text-[#0B5C66]" /> : <Upload className="w-5 h-5 text-slate-400" />}
                </label>
                
                {formData.images?.map((url, index) => (
                  <div key={index} className="relative aspect-square rounded-2xl overflow-hidden border border-gray-100 dark:border-slate-700 shadow-sm">
                    <img src={url} alt="Product" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-1 right-1 p-1 bg-rose-500 text-white rounded-lg shadow-lg hover:bg-rose-600 transition-all"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-4 bg-[#0B5C66] dark:bg-teal-600 text-white rounded-[1.5rem] font-black shadow-xl shadow-[#0B5C66]/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 mt-6 sticky bottom-0"
          >
            <Save className="w-5 h-5" />
            {isEditing ? 'Actualizar Producto' : 'Publicar Producto'}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export const ProductManager: React.FC<ProductManagerProps> = ({ token }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<Partial<Product> | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTarget, setFilterTarget] = useState('');

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get('/api/products');
      setProducts(response.data);
    } catch (err) {
      toast.error('Error al cargar productos');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleDelete = useCallback(async (id: number) => {
    toast('¿Eliminar este producto?', {
      description: 'Esta acción no se puede deshacer.',
      action: {
        label: 'Eliminar',
        onClick: async () => {
          try {
            await axios.delete(`/api/products/${id}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('Producto eliminado');
            fetchProducts();
          } catch (err) {
            toast.error('No se pudo eliminar');
          }
        }
      }
    });
  }, [token]);

  const handleEdit = useCallback((product: Product) => {
    setCurrentProduct(product);
    setIsEditing(true);
  }, []);

  const filteredProducts = useMemo(() => {
    return products.filter(p => 
      p.title.toLowerCase().includes(searchTerm.toLowerCase()) && 
      (filterTarget === '' || p.target === filterTarget)
    );
  }, [products, searchTerm, filterTarget]);

  return (
    <div className="space-y-8 py-4">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <h3 className="text-2xl font-black text-slate-900 dark:text-white">Catálogo de Productos ({filteredProducts.length})</h3>
          <p className="text-sm text-slate-500 font-medium">Administra las recomendaciones de la IA</p>
        </div>
        <button
          onClick={() => { setCurrentProduct({ target: 'spots', price: 0, images: [] }); setIsEditing(false); }}
          className="flex items-center gap-2 px-6 py-3 bg-[#0B5C66] dark:bg-teal-600 text-white rounded-2xl font-black shadow-lg shadow-[#0B5C66]/20 hover:scale-105 transition-all text-sm"
        >
          <Plus className="w-5 h-5" />
          Añadir Producto
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-grow">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nombre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl focus:ring-4 focus:ring-teal-500/10 outline-none transition-all shadow-sm"
          />
        </div>
        <div className="relative w-full sm:w-64">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <select
            value={filterTarget}
            onChange={(e) => setFilterTarget(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl appearance-none outline-none focus:ring-4 focus:ring-teal-500/10 transition-all shadow-sm"
          >
            <option value="">Todos los objetivos</option>
            <option value="spots">Puntos</option>
            <option value="wrinkles">Arrugas</option>
            <option value="texture">Textura</option>
            <option value="darkCircles">Ojeras</option>
            <option value="pores">Poros</option>
            <option value="redness">Enrojecimiento</option>
            <option value="oiliness">Grasitud</option>
            <option value="moisture">Humedad</option>
            <option value="eyebag">Bolsas</option>
            <option value="droopyEyelid">Párp. Superior</option>
            <option value="droopyLowerEyelid">Párp. Inferior</option>
            <option value="firmness">Firmeza</option>
            <option value="radiance">Luminosidad</option>
            <option value="acne">Acné</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 min-h-[400px]">
        <AnimatePresence mode="popLayout">
          {filteredProducts.map((product) => (
            <ProductItem
              key={product.id}
              product={product}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </AnimatePresence>

        {!isLoading && filteredProducts.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-20 bg-gray-50 dark:bg-slate-900/50 rounded-[3rem] border border-dashed border-gray-200 dark:border-slate-800">
            <ShoppingBag className="w-12 h-12 text-slate-300 mb-4" />
            <p className="text-slate-500 font-bold">No se encontraron productos en esta categoría</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {currentProduct && (
          <ProductForm
            initialData={currentProduct}
            isEditing={isEditing}
            onClose={() => setCurrentProduct(null)}
            onSave={() => {
              setCurrentProduct(null);
              fetchProducts();
            }}
            token={token}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
