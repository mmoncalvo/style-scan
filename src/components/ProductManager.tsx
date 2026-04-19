import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingBag, Plus, Pencil, Trash2, X, Save, Search, Filter, Image as ImageIcon, Upload, Loader2, AlertCircle } from 'lucide-react';
import { Product } from '../types';

interface ProductManagerProps {
  token: string;
}

// 1. Memoized Product Item to avoid re-renders
const ProductItem = React.memo(({ product, onEdit, onDelete }: { product: Product, onEdit: (p: Product) => void, onDelete: (id: string) => void }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="p-4 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl shadow-sm flex items-center gap-4 group transition-colors duration-300"
    >
      <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-800 flex-shrink-0 relative transition-colors duration-300">
        {product.images && product.images.length > 0 ? (
          <img src={product.images[0]} alt={product.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-slate-700">
            <ImageIcon className="w-6 h-6" />
          </div>
        )}
        {product.images && product.images.length > 1 && (
          <div className="absolute bottom-0 right-0 bg-black/60 text-white text-[8px] px-1 font-bold">
            +{product.images.length - 1}
          </div>
        )}
      </div>
      <div className="flex-grow min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-bold text-slate-800 dark:text-white truncate transition-colors duration-300">{product.title}</h4>
          <span className="px-2 py-0.5 bg-teal-50 dark:bg-teal-900/20 text-[#0B5C66] dark:text-teal-400 text-[10px] font-black uppercase tracking-widest rounded-md">
            {product.target}
          </span>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5 transition-colors duration-300">{product.description}</p>
        <p className="text-[#0B5C66] dark:text-teal-400 font-black mt-1 transition-colors duration-300">${product.price.toFixed(2)}</p>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onEdit(product)}
          className="p-2 text-slate-400 dark:text-slate-500 hover:text-[#0B5C66] dark:hover:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20 rounded-lg transition-all"
        >
          <Pencil className="w-4 h-4" />
        </button>
        <button
          onClick={() => onDelete(product.id)}
          className="p-2 text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-all"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
});

ProductItem.displayName = 'ProductItem';

// 2. Separate Component for the Form to isolate its state
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
    { value: 'droopyEyelid', label: 'Párpado Caído' },
    { value: 'acne', label: 'Acné' }
  ];

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const form = new FormData();
    // Enviar cada archivo con la clave 'productImages' para que coincida con el backend
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
      // Aseguramos que los caminos devueltos por el servidor se agreguen correctamente
      setFormData(prev => ({
        ...prev,
        images: [...(prev.images || []), ...response.data.paths]
      }));
      toast.success('Imágenes subidas correctamente');
    } catch (err) {
      console.error("Error en subida:", err);
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
        const newId = `prod_${Date.now()}`;
        await axios.post('/api/products', { ...formData, id: newId }, {
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
    <div className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 overflow-y-auto transition-colors duration-300">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-lg my-auto border border-transparent dark:border-slate-800 transition-colors duration-300 max-h-[95vh] flex flex-col"
      >
        <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-[#0B5C66] dark:bg-teal-900/40 text-white shrink-0">
          <h3 className="font-bold text-sm">{isEditing ? 'Editar Producto' : 'Nuevo Producto'}</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Título</label>
            <input
              required
              type="text"
              value={formData.title || ''}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B5C66]/20 dark:focus:ring-teal-400/20 focus:border-[#0B5C66] dark:focus:border-teal-400 text-slate-900 dark:text-white transition-all"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Objetivo</label>
              <select
                value={formData.target || 'spots'}
                onChange={(e) => setFormData({ ...formData, target: e.target.value })}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B5C66]/20 dark:focus:ring-teal-400/20 focus:border-[#0B5C66] dark:focus:border-teal-400 text-slate-900 dark:text-white transition-all"
              >
                {targetOptions.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Precio</label>
              <input
                required
                step="0.10"
                type="number"
                value={formData.price?.toFixed(2) || 0}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B5C66]/20 dark:focus:ring-teal-400/20 focus:border-[#0B5C66] dark:focus:border-teal-400 text-slate-900 dark:text-white transition-all"
              />
            </div>
          </div>
          <div className="space-y-3">
             <div className="flex items-center justify-between ml-1">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Rango de Aplicación (0-100)</label>
                <span className="text-sm font-bold text-[#0B5C66] dark:text-teal-400">{formData.range || 0}</span>
             </div>
             <input
                type="range"
                min="0"
                max="100"
                step="10"
                value={formData.range || 0}
                onChange={(e) => setFormData({ ...formData, range: parseInt(e.target.value) })}
                className="w-full h-2 bg-gray-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#0B5C66] dark:accent-teal-500"
             />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Descripción</label>
            <textarea
              required
              rows={3}
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B5C66]/20 dark:focus:ring-teal-400/20 focus:border-[#0B5C66] dark:focus:border-teal-400 text-slate-900 dark:text-white transition-all resize-none"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between ml-1">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Imágenes del Producto</label>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Sube tus archivos de imagen</span>
            </div>

            <div className="relative group">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
                id="product-image-upload"
                disabled={isUploading}
              />
              <label
                htmlFor="product-image-upload"
                className={`flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-2xl cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 hover:border-[#0B5C66]/30 dark:hover:border-teal-400/30 transition-all ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-6 h-6 text-[#0B5C66] dark:text-teal-400 animate-spin mb-2" />
                    <span className="text-xs font-bold text-[#0B5C66] dark:text-teal-400">Subiendo...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-6 h-6 text-slate-400 dark:text-slate-500 group-hover:text-[#0B5C66] dark:group-hover:text-teal-400 mb-2" />
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 group-hover:text-[#0B5C66] dark:group-hover:text-teal-400 transition-colors">Click para subir imágenes</span>
                  </>
                )}
              </label>
            </div>

            <div className="grid grid-cols-4 gap-2 mt-2">
              <AnimatePresence>
                {formData.images?.map((url, index) => (
                  <motion.div
                    key={`${url}-${index}`}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="relative aspect-square rounded-lg overflow-hidden border border-gray-100 dark:border-slate-700 group bg-gray-50 dark:bg-slate-800 shadow-sm transition-colors duration-300"
                  >
                    <img src={url} alt="Product" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-4 bg-[#0B5C66] dark:bg-teal-600 text-white rounded-2xl font-bold shadow-lg shadow-[#0B5C66]/20 dark:shadow-teal-900/20 hover:bg-[#0B5C66]/90 dark:hover:bg-teal-700 transition-all flex items-center justify-center gap-2 mt-4"
          >
            <Save className="w-5 h-5" />
            {isEditing ? 'Actualizar Producto' : 'Crear Producto'}
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

  const showModal = !!currentProduct;

  useEffect(() => {
    if (showModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [showModal]);

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

  const handleDelete = useCallback(async (id: string) => {
    toast('¿Estás seguro de que deseas eliminar este producto?', {
      description: 'Esta acción no se puede deshacer.',
      icon: <AlertCircle className="w-5 h-5 text-red-500" />,
      action: {
        label: 'Eliminar',
        onClick: async () => {
          try {
            await axios.delete(`/api/products/${id}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('Producto eliminado correctamente');
            fetchProducts();
          } catch (err) {
            console.error("Error deleting product:", err);
            toast.error('No se pudo eliminar el producto.');
          }
        }
      },
      cancel: { label: 'Cancelar', onClick: () => { } }
    });
  }, [token]);

  const handleEdit = useCallback((product: Product) => {
    setCurrentProduct(product);
    setIsEditing(true);
  }, []);

  const filteredProducts = useMemo(() => {
    return products
      .filter(p =>
        p.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
        (filterTarget === '' || p.target === filterTarget)
      )
      .sort((a, b) => {
        // IDs are generated as prod_{timestamp}, so sorting by ID descending puts newest first
        return b.id.localeCompare(a.id);
      });
  }, [products, searchTerm, filterTarget]);


  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <ShoppingBag className="w-6 h-6 text-[#0B5C66] dark:text-teal-400" />
          Gestión de Productos
        </h3>
        <button
          onClick={() => { setCurrentProduct({ target: 'spots', price: 0, images: [] }); setIsEditing(false); }}
          className="flex items-center gap-2 px-4 py-2 bg-[#0B5C66] dark:bg-teal-600 text-white rounded-xl font-bold hover:bg-[#0B5C66]/90 dark:hover:bg-teal-700 transition-all text-sm"
        >
          <Plus className="w-4 h-4" />
          Nuevo Producto
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Buscar productos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B5C66]/20 dark:focus:ring-teal-400/20 focus:border-[#0B5C66] dark:focus:border-teal-400 text-slate-900 dark:text-white transition-all text-sm transition-colors duration-300"
          />
        </div>
        <div className="relative transition-colors duration-300">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
          <select
            value={filterTarget}
            onChange={(e) => setFilterTarget(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B5C66]/20 dark:focus:ring-teal-400/20 focus:border-[#0B5C66] dark:focus:border-teal-400 text-slate-900 dark:text-white transition-all text-sm appearance-none transition-colors duration-300"
          >
            <option value="">Todos los objetivos</option>
            {[
              'spots', 'wrinkles', 'texture', 'darkCircles', 'pores',
              'redness', 'oiliness', 'moisture', 'eyebag', 'droopyEyelid', 'acne'
            ].map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      <div className="grid gap-4 overflow-x-scroll min-h-100">
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
          <div className="text-center py-12 bg-gray-50 dark:bg-slate-900/50 rounded-3xl border border-dashed border-gray-200 dark:border-slate-800 transition-colors duration-300">
            <p className="text-slate-400 dark:text-slate-600 text-sm">No se encontraron productos</p>
          </div>
        )}
      </div>

      {/* Edit/Create Modal */}
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
