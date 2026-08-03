import React, { useState, useEffect } from 'react';
import { CategoryItem } from '../types';
import { loadCategoriesFromStorage, saveCategoriesToStorage } from '../lib/storage';
import { X, Plus, Trash2, Edit2, Check, FolderOpen } from 'lucide-react';

interface CategoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCategoriesUpdated: (categories: CategoryItem[]) => void;
}

export const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({
  isOpen,
  onClose,
  onCategoriesUpdated,
}) => {
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [newCatName, setNewCatName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  useEffect(() => {
    if (isOpen) {
      const loaded = loadCategoriesFromStorage();
      setCategories(loaded);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    const trimmed = newCatName.trim();
    if (categories.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())) {
      alert('Bu kategori adı zaten mevcut!');
      return;
    }
    const newCat: CategoryItem = {
      id: 'cat-' + Date.now(),
      name: trimmed,
    };
    const updated = [...categories, newCat];
    setCategories(updated);
    saveCategoriesToStorage(updated);
    onCategoriesUpdated(updated);
    setNewCatName('');
  };

  const handleStartEdit = (cat: CategoryItem) => {
    setEditingId(cat.id);
    setEditingName(cat.name);
  };

  const handleSaveEdit = (id: string) => {
    if (!editingName.trim()) return;
    const updated = categories.map((c) =>
      c.id === id ? { ...c, name: editingName.trim() } : c
    );
    setCategories(updated);
    saveCategoriesToStorage(updated);
    onCategoriesUpdated(updated);
    setEditingId(null);
  };

  const handleDeleteCategory = (id: string) => {
    if (categories.length <= 1) {
      alert('En az bir kategori bulunmalıdır!');
      return;
    }
    const updated = categories.filter((c) => c.id !== id);
    setCategories(updated);
    saveCategoriesToStorage(updated);
    onCategoriesUpdated(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-gray-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gray-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-amber-500 rounded-lg text-gray-950">
              <FolderOpen className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-base font-black">Kategori Yönetimi</h3>
              <p className="text-xs text-gray-400">
                Mobilya kategorilerini ekleyin, silin veya düzenleyin
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Add Form */}
          <form onSubmit={handleAddCategory} className="flex items-center space-x-2">
            <input
              type="text"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder="Yeni kategori adı yazın..."
              className="flex-1 rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm focus:border-amber-500 focus:outline-none"
            />
            <button
              type="submit"
              className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center space-x-1"
            >
              <Plus className="w-4 h-4" />
              <span>Ekle</span>
            </button>
          </form>

          {/* Categories List */}
          <div className="space-y-2 pt-2">
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Mevcut Kategoriler ({categories.length})
            </div>

            <div className="space-y-1.5">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center justify-between p-3 rounded-xl border border-gray-200 bg-gray-50/60 hover:bg-white transition"
                >
                  {editingId === cat.id ? (
                    <div className="flex items-center space-x-2 flex-1 mr-2">
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="flex-1 rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm focus:border-amber-500 focus:outline-none"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(cat.id)}
                        className="p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
                        title="Kaydet"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <span className="text-sm font-semibold text-gray-800">{cat.name}</span>
                  )}

                  <div className="flex items-center space-x-1">
                    {editingId !== cat.id && (
                      <button
                        type="button"
                        onClick={() => handleStartEdit(cat)}
                        className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-200/70 rounded-lg transition"
                        title="Kategori Adını Düzenle"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDeleteCategory(cat.id)}
                      className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                      title="Kategoriyi Sil"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-gray-900 hover:bg-gray-800 text-white text-xs font-bold rounded-xl transition"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
};
