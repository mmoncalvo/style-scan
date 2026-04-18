import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingBag, Plus, Pencil, Trash2, X, Save, Search, Filter, Image as ImageIcon, Upload, Loader2, AlertCircle } from 'lucide-react';
import { Product } from '../types';

interface ProductManagerProps {
  token: string;
}

export const ProductManager: React.FC<ProductManagerProps> = ({ token }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<Partial<Product>>({ images: [] });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTarget, setFilterTarget] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const showModal = isEditing || (currentProduct.target && !isEditing);

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

  const handleDelete = async (id: string) => {
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
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('productImages', files[i]);
    }

    try {
      const response = await axios.post('/api/upload-products', formData, {
        headers: { 
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}` 
        }
      });
      const newPaths = response.data.paths;
      setCurrentProduct({
        ...currentProduct,
        images: [...(currentProduct.images || []), ...newPaths]
      });
      toast.success('Imágenes subidas correctamente');
    } catch (err) {
      toast.error('Error al subir imágenes');
    } finally {
      setIsUploading(false);
      // Clear input
      e.target.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProduct.images || currentProduct.images.length === 0) {
      toast.error('Debes subir al menos una imagen');
      return;
    }
    try {
      if (isEditing && currentProduct.id) {
        await axios.put(`/api/products/${currentProduct.id}`, currentProduct, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Producto actualizado');
      } else {
        const newId = `prod_${Date.now()}`;
        await axios.post('/api/products', { ...currentProduct, id: newId }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Producto creado');
      }
      setCurrentProduct({ images: [] });
      setIsEditing(false);
      fetchProducts();
    } catch (err) {
      toast.error('Error al guardar producto');
    }
  };

  const removeImage = (index: number) => {
    const currentImages = [...(currentProduct.images || [])];
    currentImages.splice(index, 1);
    setCurrentProduct({ ...currentProduct, images: currentImages });
  };

  const targets = [
    'spots', 'wrinkles', 'texture', 'darkCircles', 'pores', 
    'redness', 'oiliness', 'moisture', 'eyebag', 'droopyEyelid', 'acne'
  ];

  const filteredProducts = products.filter(p => 
    p.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (filterTarget === '' || p.target === filterTarget)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <ShoppingBag className="w-6 h-6 text-[#0B5C66]" />
          Gestión de Productos
        </h3>
        <button
          onClick={() => { setCurrentProduct({ target: 'spots', price: 0, images: [] }); setIsEditing(false); }}
          className="flex items-center gap-2 px-4 py-2 bg-[#0B5C66] text-white rounded-xl font-bold hover:bg-[#0B5C66]/90 transition-all text-sm"
        >
          <Plus className="w-4 h-4" />
          Nuevo Producto
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar productos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B5C66]/20 focus:border-[#0B5C66] transition-all text-sm"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <select
            value={filterTarget}
            onChange={(e) => setFilterTarget(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B5C66]/20 focus:border-[#0B5C66] transition-all text-sm appearance-none"
          >
            <option value="">Todos los objetivos</option>
            {targets.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      <div className="grid gap-4">
        <AnimatePresence mode="popLayout">
          {filteredProducts.map((product, idx) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="p-4 bg-white border border-gray-100 rounded-2xl shadow-sm flex items-center gap-4 group"
            >
              <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-50 border border-gray-100 flex-shrink-0 relative">
                {product.images && product.images.length > 0 ? (
                  <img src={product.images[0]} alt={product.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300">
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
                  <h4 className="font-bold text-slate-800 truncate">{product.title}</h4>
                  <span className="px-2 py-0.5 bg-teal-50 text-[#0B5C66] text-[10px] font-black uppercase tracking-widest rounded-md">
                    {product.target}
                  </span>
                </div>
                <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{product.description}</p>
                <p className="text-[#0B5C66] font-black mt-1">${product.price.toFixed(2)}</p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => { setCurrentProduct(product); setIsEditing(true); }}
                  className="p-2 text-slate-400 hover:text-[#0B5C66] hover:bg-teal-50 rounded-lg transition-all"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(product.id)}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {!isLoading && filteredProducts.length === 0 && (
          <div className="text-center py-12 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
            <p className="text-slate-400 text-sm">No se encontraron productos</p>
          </div>
        )}
      </div>

      {/* Edit/Create Modal */}
      <AnimatePresence>
        {(isEditing || (currentProduct.target && !isEditing)) && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden my-8"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-[#0B5C66] text-white">
                <h3 className="font-bold">{isEditing ? 'Editar Producto' : 'Nuevo Producto'}</h3>
                <button 
                  onClick={() => { setCurrentProduct({ images: [] }); setIsEditing(false); }}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Título</label>
                  <input
                    required
                    type="text"
                    value={currentProduct.title || ''}
                    onChange={(e) => setCurrentProduct({...currentProduct, title: e.target.value})}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B5C66]/20 focus:border-[#0B5C66] transition-all"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Objetivo</label>
                    <select
                      value={currentProduct.target || 'spots'}
                      onChange={(e) => setCurrentProduct({...currentProduct, target: e.target.value})}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B5C66]/20 focus:border-[#0B5C66] transition-all"
                    >
                      {targets.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Precio</label>
                    <input
                      required
                      type="number"
                      step="0.01"
                      value={currentProduct.price || 0}
                      onChange={(e) => setCurrentProduct({...currentProduct, price: parseFloat(e.target.value)})}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B5C66]/20 focus:border-[#0B5C66] transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Descripción</label>
                  <textarea
                    required
                    rows={3}
                    value={currentProduct.description || ''}
                    onChange={(e) => setCurrentProduct({...currentProduct, description: e.target.value})}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B5C66]/20 focus:border-[#0B5C66] transition-all resize-none"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between ml-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Imágenes del Producto</label>
                    <span className="text-[10px] text-slate-400 font-medium">Sube tus archivos de imagen</span>
                  </div>
                  
                  {/* File Upload */}
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
                      className={`flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-200 rounded-2xl cursor-pointer hover:bg-gray-50 hover:border-[#0B5C66]/30 transition-all ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="w-6 h-6 text-[#0B5C66] animate-spin mb-2" />
                          <span className="text-xs font-bold text-[#0B5C66]">Subiendo...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-6 h-6 text-slate-400 group-hover:text-[#0B5C66] mb-2" />
                          <span className="text-xs font-bold text-slate-500 group-hover:text-[#0B5C66]">Click para subir imágenes</span>
                        </>
                      )}
                    </label>
                  </div>

                  {/* Preview Grid */}
                  <div className="grid grid-cols-4 gap-2 mt-2">
                    <AnimatePresence>
                      {currentProduct.images?.map((url, index) => (
                        <motion.div
                          key={`${url}-${index}`}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className="relative aspect-square rounded-lg overflow-hidden border border-gray-100 group bg-gray-50 shadow-sm"
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
                  className="w-full py-4 bg-[#0B5C66] text-white rounded-2xl font-bold shadow-lg shadow-[#0B5C66]/20 hover:bg-[#0B5C66]/90 transition-all flex items-center justify-center gap-2 mt-4"
                >
                  <Save className="w-5 h-5" />
                  {isEditing ? 'Actualizar Producto' : 'Crear Producto'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
