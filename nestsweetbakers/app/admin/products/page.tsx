'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import { useRef } from 'react';
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/context/ToastContext';
import { notificationService } from '@/lib/notificationService';
import { Cake } from '@/lib/types';
import Papa from 'papaparse';
import { useSettings } from '@/hooks/useSettings';

import { 
  Plus, Edit, Trash2, Search, Package, DollarSign, Tag, X, TrendingUp, Images,
  Copy, Download, Grid3x3, List, CheckSquare, Square, Trash, Filter,
  BadgePercent, Sparkles, MapPin, Clock, Eye, EyeOff, Calendar, Star,
  Save, RefreshCw, Upload, FileSpreadsheet, Settings, Zap, AlertCircle,
  CheckCircle, Info, ChevronDown, ChevronUp
} from 'lucide-react';
import Image from 'next/image';
import ImageUpload from '@/components/ImageUpload';

interface ExtendedCake extends Omit<Cake, 'discount' | 'stock'> {
  discount?: number;
  stock?: number;
  featured?: boolean;
  tags?: string[];
  deliveryPincodes?: string[];
  currency?: 'INR' | 'CAD';
  seoKeywords?: string[];
  availableFrom?: string;
  availableTo?: string;
  minOrder?: number;
  maxOrder?: number;
   details?: string[]; 
}


export default function AdminProducts() {
  const [products, setProducts] = useState<ExtendedCake[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<ExtendedCake[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ExtendedCake | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'orders' | 'date' | 'stock'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'table'>('grid');
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [bulkDeleteMode, setBulkDeleteMode] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [featuredFilter, setFeaturedFilter] = useState<'all' | 'featured' | 'regular'>('all');
const { settings } = useSettings();
const globalPincodes =
  (settings?.allowedPincodes || '')
    .split(',')
    .map(p => p.trim())
    .filter(Boolean);

const [pincodeInput, setPincodeInput] = useState('');

const [importModal, setImportModal] = useState(false);
const [importFile, setImportFile] = useState<File | null>(null);
const [importing, setImporting] = useState(false);
const [importProgress, setImportProgress] = useState(0);
const [importErrors, setImportErrors] = useState<string[]>([]);
const [importFormat, setImportFormat] = useState<'csv' | 'json' | 'excel'>('csv');
const [jsonText, setJsonText] = useState('');
const [showJsonEditor, setShowJsonEditor] = useState(false); 
const [stockFilter, setStockFilter] = useState<'all' | 'instock' | 'lowstock' | 'outofstock'>('all');
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    id: string | string[];
    name: string;
    isBulk?: boolean;
  }>({ show: false, id: '', name: '', isBulk: false });
  const { showSuccess, showError, showInfo } = useToast();
const productRefs = useRef<Record<string, HTMLElement | null>>({});

 const [formData, setFormData] = useState<{
  name: string;
  description: string;
  basePrice: number;
  category: string;
  imageUrl: string;
  images: string[];
  discount: number;
  stock?: number;
  featured: boolean;
  tags: string[];
  deliveryPincodes: string[];
  currency: 'INR' | 'CAD';
  seoKeywords: string[];
  availableFrom: string;
  availableTo: string;
  minOrder: number;
  maxOrder: number;
  details: string[]; // ✅ correct type
}>({
  name: '',
  description: '',
  basePrice: 0,
  category: '',
  imageUrl: '',
  images: [],
  discount: 0,
  stock: undefined,
  featured: false,
  tags: [],
  deliveryPincodes: [],
  currency: 'INR',
  seoKeywords: [],
  availableFrom: '',
  availableTo: '',
  minOrder: 0.5,
  maxOrder: 10,
  details: [] // ✅ no need for “as string[]”
});


  // Calculate discounted price
  const calculateDiscountedPrice = (price: number, discount: number) => {
    return price - (price * discount / 100);
  };

  const fetchProducts = useCallback(async () => {
    try {
      const snap = await getDocs(collection(db, 'products'));
      const productsData = snap.docs.map(d => ({ 
        id: d.id, 
        ...d.data() 
      } as ExtendedCake));
      setProducts(productsData);
      setFilteredProducts(productsData);
    } catch (error) {
      console.error('Error:', error);
      showError('❌ Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Advanced filtering and sorting
  useEffect(() => {
    let result = [...products];

    // Category filter
    if (categoryFilter !== 'all') {
      result = result.filter(product => product.category === categoryFilter);
    }

    // Featured filter
    if (featuredFilter === 'featured') {
      result = result.filter(p => p.featured === true);
    } else if (featuredFilter === 'regular') {
      result = result.filter(p => !p.featured);
    }

    // Stock filter
    if (stockFilter !== 'all') {
      result = result.filter(p => {
        const stock = p.stock || 0;
        switch (stockFilter) {
          case 'instock': return stock > 10;
          case 'lowstock': return stock > 0 && stock <= 10;
          case 'outofstock': return stock === 0;
          default: return true;
        }
      });
    }

    // Search filter
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      result = result.filter(product =>
        product.name?.toLowerCase().includes(search) ||
        product.description?.toLowerCase().includes(search) ||
        product.category?.toLowerCase().includes(search) ||
        product.tags?.some(tag => tag.toLowerCase().includes(search))
      );
    }

    // Sorting
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = (a.name || '').localeCompare(b.name || '');
          break;
        case 'price':
          comparison = (a.basePrice || 0) - (b.basePrice || 0);
          break;
        case 'orders':
          comparison = (a.orderCount || 0) - (b.orderCount || 0);
          break;
        case 'stock':
          comparison = (a.stock || 0) - (b.stock || 0);
          break;
        case 'date':
          const getTimestamp = (dateValue: any): number => {
            if (!dateValue) return 0;
            if (dateValue && typeof dateValue.toDate === 'function') {
              return dateValue.toDate().getTime();
            }
            if (dateValue instanceof Date) {
              return dateValue.getTime();
            }
            if (typeof dateValue === 'string' || typeof dateValue === 'number') {
              return new Date(dateValue).getTime();
            }
            return 0;
          };
          comparison = getTimestamp(a.createdAt) - getTimestamp(b.createdAt);
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    setFilteredProducts(result);
  }, [products, categoryFilter, searchTerm, sortBy, sortOrder, featuredFilter, stockFilter]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!formData.name || !formData.description || !formData.basePrice || formData.basePrice <= 0 || !formData.category || !formData.imageUrl) {
      showError('❌ Please fill all required fields correctly');
      return;
    }

    const productData = {
      name: formData.name,
      description: formData.description,
      basePrice: formData.basePrice,
      category: formData.category,
      imageUrl: formData.imageUrl,
      images: formData.images || [],
      discount: formData.discount || 0,
      stock: formData.stock,
      featured: formData.featured || false,
      tags: formData.tags || [],
      deliveryPincodes: formData.deliveryPincodes || [],
      currency: formData.currency || 'INR',
      seoKeywords: formData.seoKeywords || [],
      availableFrom: formData.availableFrom || '',
      availableTo: formData.availableTo || '',
      minOrder: formData.minOrder || 0.5,
       details: formData.details || [],
      maxOrder: formData.maxOrder || 10
    };

    try {
      if (editingProduct?.id) {
        await updateDoc(doc(db, 'products', editingProduct.id), {
          ...productData,
          updatedAt: serverTimestamp()
        });
        setProducts(products.map(p => 
          p.id === editingProduct.id ? { ...p, ...productData } : p
        ));
        showSuccess('✅ Product updated successfully');
      } else {
        const docRef = await addDoc(collection(db, 'products'), {
          ...productData,
          orderCount: 0,
          rating: 0,
          reviewCount: 0,
          createdAt: serverTimestamp()
        });
        
        const newProduct: ExtendedCake = { 
          id: docRef.id, 
          ...productData, 
          orderCount: 0, 
          rating: 0, 
          reviewCount: 0,
          createdAt: new Date().toISOString()
        };
        setProducts([newProduct, ...products]);
        
        // Notify users about new product
        notificationService.notifyNewProduct({
          id: docRef.id,
          name: productData.name,
          basePrice: productData.basePrice
        }).catch(err => console.error('Failed to send notifications:', err));
        
        showSuccess('✅ Product added successfully');
      }
      
      resetForm();
    } catch (error) {
      console.error('Error:', error);
      showError('❌ Failed to save product');
    }
  }

  async function handleDelete() {
    try {
      if (confirmModal.isBulk && Array.isArray(confirmModal.id)) {
        const batch = writeBatch(db);
        confirmModal.id.forEach(id => {
          batch.delete(doc(db, 'products', id));
        });
        await batch.commit();
        
        setProducts(products.filter(p => !confirmModal.id.includes(p.id!)));
        setSelectedProducts(new Set());
        setBulkDeleteMode(false);
        showSuccess(`✅ ${confirmModal.id.length} products deleted successfully`);
      } else if (typeof confirmModal.id === 'string') {
        await deleteDoc(doc(db, 'products', confirmModal.id));
        setProducts(products.filter(p => p.id !== confirmModal.id));
        showSuccess('✅ Product deleted successfully');
      }
      
      setConfirmModal({ show: false, id: '', name: '', isBulk: false });
    } catch (error) {
      console.error('Error:', error);
      showError('❌ Failed to delete product(s)');
    }
  }

  async function duplicateProduct(product: ExtendedCake) {
    try {
      const { id, createdAt, ...productWithoutId } = product;
      const duplicateData = {
        ...productWithoutId,
        name: `${product.name} (Copy)`,
        orderCount: 0,
        rating: 0,
        reviewCount: 0,
        createdAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'products'), duplicateData);
      const newProduct: ExtendedCake = { 
        id: docRef.id, 
        ...duplicateData,
        createdAt: new Date().toISOString()
      };
      setProducts([newProduct, ...products]);
      showSuccess('✅ Product duplicated successfully');
    } catch (error) {
      console.error('Error:', error);
      showError('❌ Failed to duplicate product');
    }
  }

  async function toggleFeatured(product: ExtendedCake) {
    if (!product.id) return;
    
    try {
      const newFeatured = !product.featured;
      await updateDoc(doc(db, 'products', product.id), {
        featured: newFeatured
      });
      
      setProducts(products.map(p => 
        p.id === product.id ? { ...p, featured: newFeatured } : p
      ));
      
      showSuccess(newFeatured ? '⭐ Product marked as featured' : '✓ Removed from featured');
    } catch (error) {
      showError('Failed to update product');
    }
  }
  // Add CSV Template Download Function
function downloadTemplate() {
   const template = `Name,Description,Category,Base Price,Currency,Discount,Stock,Featured,Tags,Delivery Pincodes,SEO Keywords,Min Order,Max Order,Image URL,Images,Details
Chocolate Truffle Cake,Rich and creamy chocolate cake,Birthday,599,INR,10,50,true,"Chocolate,Premium,Birthday","110001,110002","best chocolate cake,truffle cake online",0.5,10,https://images.unsplash.com/photo-1578985545062-69928b1d9587,"https://.../img1;https://.../img2","100% eggless;Freshly baked;Premium ingredients"
Vanilla Sponge Cake,Light and fluffy vanilla delight,Birthday,499,INR,5,30,false,"Vanilla,Classic","110001,110002,110003","vanilla cake,sponge cake",0.5,5,https://images.unsplash.com/photo-1464349095431-e9a21285b5f3,"","Soft sponge;Perfect for birthdays"`;

  const blob = new Blob([template], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'products_import_template.csv';
  link.click();
  URL.revokeObjectURL(url);
  
  showSuccess('✅ Template downloaded successfully');
}

// CSV Import Function
async function handleImportCSV() {
  if (!importFile) {
    showError('❌ Please select a CSV file');
    return;
  }

  setImporting(true);
  setImportErrors([]);
  setImportProgress(0);

  Papa.parse(importFile, {
    header: true,
    skipEmptyLines: true,
    complete: async (results) => {
      const data = results.data as any[];
      const errors: string[] = [];
      let successCount = 0;

      try {
        const batch = writeBatch(db);
        
        for (let i = 0; i < data.length; i++) {
          const row = data[i];
          
          // Validate required fields
          if (!row.Name || !row.Description || !row.Category || !row['Base Price'] || !row['Image URL']) {
            errors.push(`Row ${i + 2}: Missing required fields`);
            continue;
          }

          const productData = {
            name: row.Name.trim(),
            description: row.Description.trim(),
            category: row.Category.trim(),
            basePrice: parseFloat(row['Base Price']) || 0,
            currency: (row.Currency || 'INR').toUpperCase() as 'INR' | 'CAD',
             imageUrl: row['Image URL'].trim(),
  images: row.Images
    ? row.Images.split(/[;,\|]/).map((u: string) => u.trim()).filter(Boolean)
    : [],
            discount: parseInt(row.Discount) || 0,
            stock: row.Stock ? parseInt(row.Stock) : undefined,
            featured: row.Featured?.toLowerCase() === 'true',
            tags: row.Tags ? row.Tags.split(',').map((t: string) => t.trim()) : [],
           deliveryPincodes: row['Delivery Pincodes']
    ? row['Delivery Pincodes'].split(',').map((p: string) => p.trim())
    : [],
     details: row.Details
    ? row.Details.split(/[;,\|]/).map((d: string) => d.trim()).filter(Boolean)
    : [],
           seoKeywords: row['SEO Keywords']
    ? row['SEO Keywords'].split(',').map((k: string) => k.trim())
    : [],
            minOrder: parseFloat(row['Min Order']) || 0.5,
            maxOrder: parseFloat(row['Max Order']) || 10,
            orderCount: 0,
            rating: 0,
            reviewCount: 0,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          };

          const docRef = doc(collection(db, 'products'));
          batch.set(docRef, productData);
          successCount++;
          
          setImportProgress(Math.round(((i + 1) / data.length) * 100));
        }

        await batch.commit();

        // Notify all users about new products
        await notifyAllUsersNewProducts(successCount);

        showSuccess(`✅ Successfully imported ${successCount} products!`);
        if (errors.length > 0) {
          setImportErrors(errors);
          showInfo(`⚠️ ${errors.length} rows had errors`);
        }
        
        fetchProducts();
        setImportModal(false);
        setImportFile(null);
      } catch (error) {
        console.error('Import error:', error);
        showError('❌ Failed to import products');
      } finally {
        setImporting(false);
        setImportProgress(0);
      }
    },
    error: (error) => {
      console.error('CSV Parse Error:', error);
      showError('❌ Failed to parse CSV file');
      setImporting(false);
    }
  });
}

// Notify all users function
async function notifyAllUsersNewProducts(count: number) {
  try {
    const usersSnapshot = await getDocs(collection(db, 'users'));
    const batch = writeBatch(db);
    
    usersSnapshot.docs.forEach((userDoc) => {
      const notifRef = doc(collection(db, 'notifications'));
      batch.set(notifRef, {
        userId: userDoc.id,
        title: '🎉 New Cakes Added!',
        body: `${count} delicious new cake${count > 1 ? 's' : ''} just added to our menu. Check them out now!`,
        type: 'info',
        read: false,
        createdAt: serverTimestamp(),
        actionUrl: '/products'
      });
    });

    await batch.commit();
  } catch (error) {
    console.error('Error sending notifications:', error);
  }
}
// Multi-format import handler
async function handleMultiFormatImport() {
  if (importFormat === 'json') {
    await handleImportJSON();
  } else if (importFormat === 'csv') {
    await handleImportCSV();
  } else if (importFormat === 'excel') {
    await handleImportExcel();
  }
}

// JSON Import Function
async function handleImportJSON() {
  try {
    setImporting(true);
    setImportErrors([]);
    setImportProgress(0);

    let data: any[];

    // Parse JSON from file or text editor
    if (importFile) {
      const fileText = await importFile.text();
      data = JSON.parse(fileText);
    } else if (jsonText.trim()) {
      data = JSON.parse(jsonText);
    } else {
      showError('❌ Please provide JSON data');
      return;
    }

    // Validate JSON structure
    if (!Array.isArray(data)) {
      showError('❌ JSON must be an array of products');
      return;
    }

    const errors: string[] = [];
    let successCount = 0;
    const batch = writeBatch(db);

    for (let i = 0; i < data.length; i++) {
      const item = data[i];

      // Validate required fields
      if (!item.name || !item.description || !item.category || !item.basePrice || !item.imageUrl) {
        errors.push(`Product ${i + 1}: Missing required fields (name, description, category, basePrice, imageUrl)`);
        continue;
      }

      const productData = {
        name: item.name,
        description: item.description,
        details: Array.isArray(item.details) ? item.details : [],  
        category: item.category,
        basePrice: parseFloat(item.basePrice) || 0,
        currency: (item.currency || 'INR').toUpperCase() as 'INR' | 'CAD',
         imageUrl: item.imageUrl,
  images: Array.isArray(item.images) ? item.images : [],
        discount: parseInt(item.discount) || 0,
        stock: item.stock !== undefined ? parseInt(item.stock) : undefined,
        featured: item.featured === true || item.featured === 'true',
        tags: Array.isArray(item.tags) ? item.tags : [],
          deliveryPincodes: Array.isArray(item.deliveryPincodes) ? item.deliveryPincodes : [],
       seoKeywords: Array.isArray(item.seoKeywords) ? item.seoKeywords : [],
        minOrder: parseFloat(item.minOrder) || 0.5,
        maxOrder: parseFloat(item.maxOrder) || 10,
        orderCount: 0,
        rating: 0,
        reviewCount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const docRef = doc(collection(db, 'products'));
      batch.set(docRef, productData);
      successCount++;

      setImportProgress(Math.round(((i + 1) / data.length) * 100));
    }

    await batch.commit();
    await notifyAllUsersNewProducts(successCount);

    showSuccess(`✅ Successfully imported ${successCount} products from JSON!`);
    if (errors.length > 0) {
      setImportErrors(errors);
      showInfo(`⚠️ ${errors.length} products had errors`);
    }

    fetchProducts();
    setImportModal(false);
    setImportFile(null);
    setJsonText('');
  } catch (error: any) {
    console.error('JSON Import Error:', error);
    showError(`❌ JSON Parse Error: ${error.message}`);
  } finally {
    setImporting(false);
    setImportProgress(0);
  }
}

// Excel/XLSX Import Function (requires xlsx library)
async function handleImportExcel() {
  if (!importFile) {
    showError('❌ Please select an Excel file');
    return;
  }

  try {
    setImporting(true);
    setImportErrors([]);
    setImportProgress(0);

    const XLSX = await import('xlsx');
    const fileBuffer = await importFile.arrayBuffer();
    const workbook = XLSX.read(fileBuffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    const errors: string[] = [];
    let successCount = 0;
    const batch = writeBatch(db);

    for (let i = 0; i < data.length; i++) {
      const row: any = data[i];

      // Validate required fields (same column names as CSV)
      if (!row.Name || !row.Description || !row.Category || !row['Base Price'] || !row['Image URL']) {
        errors.push(`Row ${i + 2}: Missing required fields`);
        continue;
      }

      const productData = {
        name: row.Name.toString().trim(),
        description: row.Description.toString().trim(),
        category: row.Category.toString().trim(),
        basePrice: parseFloat(row['Base Price']) || 0,
        currency: (row.Currency || 'INR').toString().toUpperCase() as 'INR' | 'CAD',
        imageUrl: row['Image URL'].trim(),
  images: row.Images
    ? row.Images.split(/[;,\|]/).map((u: string) => u.trim()).filter(Boolean)
    : [],
        discount: parseInt(row.Discount) || 0,
        stock: row.Stock ? parseInt(row.Stock) : undefined,
        featured: row.Featured?.toString().toLowerCase() === 'true',
        tags: row.Tags ? row.Tags.toString().split(',').map((t: string) => t.trim()) : [],
        deliveryPincodes: row['Delivery Pincodes']
    ? row['Delivery Pincodes'].split(',').map((p: string) => p.trim())
    : [],
        seoKeywords: row['SEO Keywords']
    ? row['SEO Keywords'].split(',').map((k: string) => k.trim())
    : [],
     details: row.Details
    ? row.Details.split(/[;,\|]/).map((d: string) => d.trim()).filter(Boolean)
    : [],
        minOrder: parseFloat(row['Min Order']) || 0.5,
        maxOrder: parseFloat(row['Max Order']) || 10,
        orderCount: 0,
        rating: 0,
        reviewCount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const docRef = doc(collection(db, 'products'));
      batch.set(docRef, productData);
      successCount++;

      setImportProgress(Math.round(((i + 1) / data.length) * 100));
    }

    await batch.commit();
    await notifyAllUsersNewProducts(successCount);

    showSuccess(`✅ Successfully imported ${successCount} products from Excel!`);
    if (errors.length > 0) {
      setImportErrors(errors);
      showInfo(`⚠️ ${errors.length} rows had errors`);
    }

    fetchProducts();
    setImportModal(false);
    setImportFile(null);
  } catch (error: any) {
    console.error('Excel Import Error:', error);
    showError(`❌ Failed to import Excel file: ${error.message}`);
  } finally {
    setImporting(false);
    setImportProgress(0);
  }
}

// Download JSON Template
function downloadJSONTemplate() {
  const template = [
    {
      name: "Chocolate Truffle Cake",
      description: "Rich and creamy chocolate cake with truffle layers",
      category: "Birthday",
      basePrice: 599,
      currency: "INR",
      discount: 10,
      stock: 50,
      featured: true,
      tags: ["Chocolate", "Premium", "Birthday"],
      deliveryPincodes: ["110001", "110002"],
      seoKeywords: ["best chocolate cake", "truffle cake online"],
      minOrder: 0.5,
      maxOrder: 10,
      imageUrl: "https://images.unsplash.com/photo-1578985545062-69928b1d9587",
      images: [
        "https://.../img1",
        "https://.../img2"
      ],
      details: [
        "100% eggless",
        "Freshly baked to order",
        "Premium ingredients"
      ]
    },
    {
      name: "Vanilla Sponge Cake",
      description: "Light and fluffy vanilla delight",
      category: "Birthday",
      basePrice: 499,
      currency: "INR",
      discount: 5,
      stock: 30,
      featured: false,
      tags: ["Vanilla", "Classic"],
      deliveryPincodes: ["110001", "110002", "110003"],
      seoKeywords: ["vanilla cake", "sponge cake"],
      minOrder: 0.5,
      maxOrder: 5,
      imageUrl: "https://images.unsplash.com/photo-1464349095431-e9a21285b5f3"
    }
  ];

  const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'products_import_template.json';
  link.click();
  URL.revokeObjectURL(url);

  showSuccess('✅ JSON Template downloaded successfully');
}

// Download Excel Template
function downloadExcelTemplate() {
  const template = `Name,Description,Category,Base Price,Currency,Discount,Stock,Featured,Tags,Delivery Pincodes,SEO Keywords,Min Order,Max Order,Image URL,Images,Details
Chocolate Truffle Cake,Rich and creamy chocolate cake,Birthday,599,INR,10,50,true,"Chocolate,Premium,Birthday","110001,110002","best chocolate cake,truffle cake online",0.5,10,https://images.unsplash.com/photo-1578985545062-69928b1d9587,"https://.../img1;https://.../img2","100% eggless;Freshly baked;Premium ingredients"
Vanilla Sponge Cake,Light and fluffy vanilla delight,Birthday,499,INR,5,30,false,"Vanilla,Classic","110001,110002,110003","vanilla cake,sponge cake",0.5,5,https://images.unsplash.com/photo-1464349095431-e9a21285b5f3,"","Soft sponge;Perfect for birthdays"`;

  const blob = new Blob([template], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'products_import_template.xlsx';
  link.click();
  URL.revokeObjectURL(url);

  showSuccess('✅ Excel Template downloaded successfully');
}

  function exportToCSV() {
    const headers = ['Name', 'Description', 'Category', 'Base Price', 'Discount %', 'Final Price', 'Stock', 'Currency', 'Orders', 'Featured', 'Tags', 'Image URL'];
    const rows = filteredProducts.map(p => [
      p.name,
      p.description,
      p.category,
      p.basePrice,
      p.discount || 0,
      calculateDiscountedPrice(p.basePrice || 0, p.discount || 0),
      p.stock || 'N/A',
      p.currency || 'INR',
      p.orderCount || 0,
      p.featured ? 'Yes' : 'No',
      (p.tags || []).join('; '),
      p.imageUrl
    ]);

    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `products_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    
    showSuccess('✅ Products exported successfully');
  }

  function resetForm() {
    setFormData({
      name: '',
      description: '',
      basePrice: 0,
      category: '',
      imageUrl: '',
      images: [],
      discount: 0,
      stock: undefined,
      featured: false,
      tags: [],
      deliveryPincodes: [],
      currency: 'INR',
      seoKeywords: [],
      availableFrom: '',
      availableTo: '',
      minOrder: 0.5,
       details: [],
      maxOrder: 10
    });
    setEditingProduct(null);
    setShowForm(false);
  }

  function editProduct(product: ExtendedCake) {
    setEditingProduct(product);
    setFormData({
      name: product.name || '',
      description: product.description || '',
      basePrice: product.basePrice || 0,
      category: product.category || '',
      imageUrl: product.imageUrl || '',
      images: product.images || [],
      discount: product.discount || 0,
      stock: product.stock,
      featured: product.featured || false,
      tags: product.tags || [],
      deliveryPincodes: product.deliveryPincodes || [],
      currency: product.currency || 'INR',
      seoKeywords: product.seoKeywords || [],
      availableFrom: product.availableFrom || '',
      availableTo: product.availableTo || '',
      details: product.details || [],
      minOrder: product.minOrder || 0.5,
      maxOrder: product.maxOrder || 10
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function toggleSelectProduct(id: string) {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedProducts(newSelected);
  }

  function selectAllProducts() {
    if (selectedProducts.size === filteredProducts.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(filteredProducts.map(p => p.id!)));
    }
  }

  function handleBulkDelete() {
    if (selectedProducts.size === 0) {
      showError('❌ Please select products to delete');
      return;
    }
    
    setConfirmModal({
      show: true,
      id: Array.from(selectedProducts),
      name: `${selectedProducts.size} product(s)`,
      isBulk: true
    });
  }

  const categories = ['Birthday', 'Wedding', 'Anniversary', 'Custom', 'Special', 'Eggless', 'Vegan'];
  const suggestedTags = ['Chocolate', 'Vanilla', 'Strawberry', 'Butterscotch', 'Red Velvet', 'Black Forest', 'Premium', 'Budget', 'Kids Special'];
  
  const stats = {
  total: products.length,
  featured: products.filter(p => p.featured).length,
  inStock: products.filter(p => (p.stock || 0) > 10).length,
  lowStock: products.filter(p => {
    const stock = p.stock || 0;
    return stock > 0 && stock <= 10;
  }).length,
  outOfStock: products.filter(p => p.stock === 0).length,
  totalValueINR: products.reduce((sum, p) => {
    const value = (p.basePrice || 0) * (p.stock || 0);
    return (p.currency || 'INR') === 'INR' ? sum + value : sum;
  }, 0),
  totalValueCAD: products.reduce((sum, p) => {
    const value = (p.basePrice || 0) * (p.stock || 0);
    return p.currency === 'CAD' ? sum + value : sum;
  }, 0),
  avgDiscount: products.length > 0
    ? products.reduce((sum, p) => sum + (p.discount || 0), 0) / products.length
    : 0,
};


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className="absolute inset-0 border-4 border-pink-200 rounded-full animate-ping"></div>
            <div className="relative w-24 h-24 border-4 border-pink-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-gray-600 font-semibold text-lg">Loading products...</p>
        </div>
      </div>
    );
  }const defaultDetailSets: string[][] = [
  [
    '100% eggless',
    'Freshly baked to order',
    'Premium quality ingredients',
    'Perfect for birthdays & celebrations',
  ],
  [
    'Same-day / next-day delivery (as per availability)',
    'Customizable design and message on cake',
    'Handled with temperature-controlled delivery',
    'Ideal for gifting your loved ones',
  ],
  [
    'Soft, moist sponge with rich cream layers',
    'Prepared in FSSAI-approved kitchen',
    'Packed in secure, tamper-proof boxes',
    'Best consumed within 24 hours of delivery',
  ],
];
const addPincodesFromString = (value: string) => {
  const parts = value
    .split(/[,\s]+/)
    .map(p => p.trim())
    .filter(Boolean);

  if (!parts.length) return;

  const current = new Set(formData.deliveryPincodes || []);
  parts.forEach(p => current.add(p));

  setFormData({
    ...formData,
    deliveryPincodes: Array.from(current),
  });
  setPincodeInput('');
};

const removePincode = (pin: string) => {
  setFormData({
    ...formData,
    deliveryPincodes: (formData.deliveryPincodes || []).filter(p => p !== pin),
  });
};


  return (
    <div className="space-y-6 animate-fade-in">
      {/* Delete Confirmation Modal */}
      {confirmModal.show && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-scale-up">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="text-red-600" size={32} />
            </div>
            <h3 className="text-2xl font-bold text-center text-gray-800 mb-2">
              {confirmModal.isBulk ? 'Delete Multiple Products?' : 'Delete Product?'}
            </h3>
            <p className="text-gray-600 text-center mb-6">
              Are you sure you want to delete <strong>{confirmModal.name}</strong>? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmModal({ show: false, id: '', name: '', isBulk: false })}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-all"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

{importModal && (
  <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in overflow-y-auto">
    <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full p-6 animate-scale-up my-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
            <Upload className="text-purple-600" size={24} />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-800">Import Products</h3>
            <p className="text-sm text-gray-600">Bulk upload via CSV, JSON, or Excel</p>
          </div>
        </div>
        <button
          onClick={() => {
            setImportModal(false);
            setImportFile(null);
            setJsonText('');
            setImportErrors([]);
          }}
          className="p-2 hover:bg-gray-100 rounded-lg transition"
        >
          <X size={24} />
        </button>
      </div>

      <div className="space-y-4">
        {/* Format Selection */}
        <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl">
          <h4 className="font-bold text-purple-900 mb-3">Select Import Format</h4>
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => setImportFormat('csv')}
              className={`p-4 rounded-xl border-2 transition-all ${
                importFormat === 'csv'
                  ? 'bg-purple-600 text-white border-purple-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-purple-400'
              }`}
            >
              <FileSpreadsheet size={24} className="mx-auto mb-2" />
              <div className="font-bold text-sm">CSV File</div>
              <div className="text-xs opacity-80">.csv format</div>
            </button>

            <button
              onClick={() => setImportFormat('json')}
              className={`p-4 rounded-xl border-2 transition-all ${
                importFormat === 'json'
                  ? 'bg-purple-600 text-white border-purple-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-purple-400'
              }`}
            >
              <Settings size={24} className="mx-auto mb-2" />
              <div className="font-bold text-sm">JSON</div>
              <div className="text-xs opacity-80">File or text</div>
            </button>

            <button
              onClick={() => setImportFormat('excel')}
              className={`p-4 rounded-xl border-2 transition-all ${
                importFormat === 'excel'
                  ? 'bg-purple-600 text-white border-purple-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-purple-400'
              }`}
            >
              <FileSpreadsheet size={24} className="mx-auto mb-2" />
              <div className="font-bold text-sm">Excel</div>
              <div className="text-xs opacity-80">.xlsx format</div>
            </button>
          </div>
        </div>

        {/* Download Template */}
        <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
          <div className="flex items-start gap-3">
            <Info className="text-blue-600 flex-shrink-0 mt-1" size={20} />
            <div className="flex-1">
              <h4 className="font-bold text-blue-900 mb-2">Step 1: Download Template</h4>
              <p className="text-sm text-blue-800 mb-3">
                Download the {importFormat.toUpperCase()} template and fill in your product data.
              </p>
              <button
                onClick={() => {
                  if (importFormat === 'csv') downloadTemplate();
                  else if (importFormat === 'json') downloadJSONTemplate();
                  else downloadExcelTemplate();
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
              >
                <Download size={18} />
                Download {importFormat.toUpperCase()} Template
              </button>
            </div>
          </div>
        </div>

        {/* Upload/Input Section */}
        {importFormat === 'json' ? (
          <div className="p-4 bg-purple-50 border-2 border-purple-200 rounded-xl">
            <h4 className="font-bold text-purple-900 mb-3">Step 2: Provide JSON Data</h4>
            
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setShowJsonEditor(!showJsonEditor)}
                className={`flex-1 px-4 py-2 rounded-lg font-semibold transition ${
                  showJsonEditor
                    ? 'bg-purple-600 text-white'
                    : 'bg-white text-purple-700 border-2 border-purple-300'
                }`}
              >
                <Settings size={18} className="inline mr-2" />
                Paste JSON
              </button>
              <button
                onClick={() => setShowJsonEditor(false)}
                className={`flex-1 px-4 py-2 rounded-lg font-semibold transition ${
                  !showJsonEditor
                    ? 'bg-purple-600 text-white'
                    : 'bg-white text-purple-700 border-2 border-purple-300'
                }`}
              >
                <Upload size={18} className="inline mr-2" />
                Upload File
              </button>
            </div>

            {showJsonEditor ? (
              <textarea
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                placeholder='[{"name": "Cake Name", "description": "...", ...}]'
                className="w-full h-64 px-4 py-3 border-2 border-purple-300 rounded-xl font-mono text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            ) : (
              <>
                <input
                  type="file"
                  accept=".json"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setImportFile(file);
                      setImportErrors([]);
                    }
                  }}
                  className="w-full px-4 py-3 border-2 border-purple-300 rounded-xl focus:ring-2 focus:ring-purple-500"
                />
                {importFile && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-green-700">
                    <CheckCircle size={16} />
                    {importFile.name} ({(importFile.size / 1024).toFixed(2)} KB)
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="p-4 bg-purple-50 border-2 border-purple-200 rounded-xl">
            <h4 className="font-bold text-purple-900 mb-3">
              Step 2: Upload Your {importFormat.toUpperCase()} File
            </h4>
            <input
              type="file"
              accept={importFormat === 'csv' ? '.csv' : '.xlsx,.xls'}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setImportFile(file);
                  setImportErrors([]);
                }
              }}
              className="w-full px-4 py-3 border-2 border-purple-300 rounded-xl focus:ring-2 focus:ring-purple-500"
            />
            {importFile && (
              <div className="mt-2 flex items-center gap-2 text-sm text-green-700">
                <CheckCircle size={16} />
                {importFile.name} ({(importFile.size / 1024).toFixed(2)} KB)
              </div>
            )}
          </div>
        )}

        {/* Progress, Errors, Instructions - Same as before */}
        {importing && (
          <div className="p-4 bg-green-50 border-2 border-green-200 rounded-xl">
            <h4 className="font-bold text-green-900 mb-3">Importing Products...</h4>
            <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
              <div
                className="bg-gradient-to-r from-green-500 to-green-600 h-full transition-all duration-300 flex items-center justify-center text-xs text-white font-bold"
                style={{ width: `${importProgress}%` }}
              >
                {importProgress}%
              </div>
            </div>
          </div>
        )}

        {importErrors.length > 0 && (
          <div className="p-4 bg-red-50 border-2 border-red-200 rounded-xl max-h-60 overflow-y-auto">
            <h4 className="font-bold text-red-900 mb-2 flex items-center gap-2">
              <AlertCircle size={20} />
              Import Errors ({importErrors.length})
            </h4>
            <ul className="space-y-1">
              {importErrors.map((error, idx) => (
                <li key={idx} className="text-sm text-red-700">• {error}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => {
              setImportModal(false);
              setImportFile(null);
              setJsonText('');
              setImportErrors([]);
            }}
            className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-all"
            disabled={importing}
          >
            Cancel
          </button>
          <button
            onClick={handleMultiFormatImport}
            disabled={(importFormat === 'json' ? !importFile && !jsonText : !importFile) || importing}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {importing ? (
              <>
                <RefreshCw className="animate-spin" size={18} />
                Importing...
              </>
            ) : (
              <>
                <Upload size={18} />
                Import Products
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  </div>
)}


      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
            Products Management
          </h1>
          <p className="text-gray-600 mt-2 flex items-center gap-2">
            <Package size={16} />
            Manage your complete cake catalog with advanced controls
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all font-semibold shadow-lg"
          >
            <Download size={18} />
            <span className="hidden sm:inline">Export</span>
          </button>
          <button
            onClick={fetchProducts}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all font-semibold shadow-lg"
            title="Refresh"
          >
            <RefreshCw size={18} />
          </button>
          <button
  onClick={() => setImportModal(true)}
  className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-all font-semibold shadow-lg"
>
  <Upload size={18} />
  <span className="hidden sm:inline">Import CSV</span>
</button>
          <button
            onClick={() => {
              if (showForm) {
                resetForm();
              } else {
                setShowForm(true);
              }
            }}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-pink-600 to-purple-600 text-white px-6 py-2.5 rounded-xl hover:from-pink-700 hover:to-purple-700 transition-all transform hover:scale-105 shadow-lg font-semibold"
          >
            {showForm ? <X size={20} /> : <Plus size={20} />}
            {showForm ? 'Cancel' : 'Add Product'}
          </button>
        </div>
      </div>
  
      {/* Enhanced Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border-2 border-blue-200">
          <p className="text-xs font-semibold text-blue-700 mb-1">Total Products</p>
          <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
        </div>
        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-4 border-2 border-yellow-200">
          <p className="text-xs font-semibold text-yellow-700 mb-1 flex items-center gap-1">
            <Star size={12} />
            Featured
          </p>
          <p className="text-2xl font-bold text-yellow-600">{stats.featured}</p>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border-2 border-green-200">
          <p className="text-xs font-semibold text-green-700 mb-1">In Stock</p>
          <p className="text-2xl font-bold text-green-600">{stats.inStock}</p>
        </div>
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 border-2 border-orange-200">
          <p className="text-xs font-semibold text-orange-700 mb-1">Low Stock</p>
          <p className="text-2xl font-bold text-orange-600">{stats.lowStock}</p>
        </div>
        <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-4 border-2 border-red-200">
          <p className="text-xs font-semibold text-red-700 mb-1">Out of Stock</p>
          <p className="text-2xl font-bold text-red-600">{stats.outOfStock}</p>
        </div>
       <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border-2 border-purple-200">
  <p className="text-xs font-semibold text-purple-700 mb-1">Inventory Value</p>
  <div className="text-sm font-semibold text-purple-700 space-y-0.5">
    <p className="text-xl font-bold text-purple-600">
      ₹{Math.round(stats.totalValueINR).toLocaleString('en-IN')}
      <span className="ml-1 text-xs font-normal text-purple-700">INR</span>
    </p>
    <p className="text-base font-bold text-purple-600">
      CA${Math.round(stats.totalValueCAD).toLocaleString('en-CA')}
      <span className="ml-1 text-xs font-normal text-purple-700">CAD</span>
    </p>
  </div>
</div>

        <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-xl p-4 border-2 border-pink-200">
          <p className="text-xs font-semibold text-pink-700 mb-1">Avg Discount</p>
          <p className="text-2xl font-bold text-pink-600">{stats.avgDiscount.toFixed(1)}%</p>
        </div>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-white rounded-2xl shadow-2xl p-6 animate-scale-up border-2 border-pink-200">
         <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
  {editingProduct ? (
    <>
      <Edit size={24} className="text-pink-600" />
      Edit Product: {editingProduct.name}
    </>
  ) : (
    <>
      <Plus size={24} className="text-pink-600" />
      Add New Product
    </>
  )}
</h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Image Upload */}
            <ImageUpload
              value={[formData.imageUrl, ...formData.images].filter(Boolean) as string[]}
              onChange={(urls) => {
                const urlArray = Array.isArray(urls) ? urls : [urls];
                setFormData({
                  ...formData,
                  imageUrl: urlArray[0] || '',
                  images: urlArray.slice(1, 5)
                });
              }}
              multiple
              maxImages={5}
              label="Product Images (1 main + up to 4 additional) *"
            />

            {/* Basic Information */}
            <div className="p-4 bg-blue-50 rounded-xl border-2 border-blue-200">
              <h3 className="font-bold text-lg text-blue-900 mb-4 flex items-center gap-2">
                <Info size={20} />
                Basic Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Chocolate Truffle Cake"
                    required
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <Tag size={16} />
                    Category *
                  </label>
                  <select
                    required
                    value={formData.category}
                    onChange={e => setFormData({...formData, category: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
                  >
                    <option value="">Select Category</option>
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Description *
                  </label>
                  <textarea
                    placeholder="Describe your delicious cake in detail..."
                    required
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all resize-none"
                    rows={3}
                  />
                </div>
              </div>
            </div>
{/* Product Details / Highlights */}
<div className="p-4 bg-emerald-50 rounded-xl border-2 border-emerald-200">
  <h3 className="font-bold text-lg text-emerald-900 mb-4 flex items-center gap-2">
    <Sparkles size={20} />
    Product Details / Highlights
  </h3>

  <p className="text-xs text-gray-600 mb-2">
    These points will be shown on the cake details page. One point per line.
  </p>

  <textarea
    placeholder={'e.g.\n• 100% eggless\n• Freshly baked on order\n• Premium ingredients only'}
    value={(formData.details || []).join('\n')}
    onChange={e =>
      setFormData({
        ...formData,
        details: e.target.value
          .split('\n')
          .map(l => l.replace(/^[-•]\s*/, '').trim())
          .filter(Boolean),
      })
    }
    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all font-mono text-sm"
    rows={4}
  />

  <div className="flex flex-wrap gap-2 mt-3">
    <button
      type="button"
      onClick={() => {
        const random =
          defaultDetailSets[Math.floor(Math.random() * defaultDetailSets.length)];
        setFormData({ ...formData, details: random });
      }}
      className="px-3 py-1.5 bg-emerald-600 text-white rounded-full text-xs font-semibold hover:bg-emerald-700 transition flex items-center gap-1"
    >
      <Zap size={14} />
      Use Random Default Details
    </button>
  </div>
</div>

            {/* Pricing & Discount */}
            <div className="p-4 bg-green-50 rounded-xl border-2 border-green-200">
              <h3 className="font-bold text-lg text-green-900 mb-4 flex items-center gap-2">
                <DollarSign size={20} />
                Pricing & Discount
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Currency *
                  </label>
                  <select
                    value={formData.currency}
                    onChange={e => setFormData({...formData, currency: e.target.value as 'INR' | 'CAD'})}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
                  >
                    <option value="INR">₹ INR (Rupees)</option>
                    <option value="CAD">$ CAD (Canadian Dollar)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Base Price ({formData.currency === 'CAD' ? '$' : '₹'}) *
                  </label>
                  <input
                    type="number"
                    placeholder="500"
                    required
                    min="1"
                    step="0.01"
                    value={formData.basePrice || ''}
                    onChange={e => setFormData({...formData, basePrice: parseFloat(e.target.value) || 0})}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <BadgePercent size={16} />
                    Discount (%)
                  </label>
                  <input
                    type="number"
                    placeholder="0"
                    min="0"
                    max="100"
                    value={formData.discount}
                    onChange={e => setFormData({...formData, discount: parseInt(e.target.value) || 0})}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {/* Discount Calculation Display */}
              {formData.basePrice && formData.discount && formData.discount > 0 && (
                <div className="mt-4 p-4 bg-yellow-100 rounded-lg border-2 border-yellow-300">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-yellow-900">Original Price:</span>
                    <span className="text-gray-700 line-through">
                      {formData.currency === 'CAD' ? '$' : '₹'}{formData.basePrice}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-lg font-bold mt-2">
                    <span className="text-green-900">Final Price:</span>
                    <span className="text-green-700">
                      {formData.currency === 'CAD' ? '$' : '₹'}
                      {calculateDiscountedPrice(formData.basePrice, formData.discount).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-1">
                    <span className="text-green-700">You Save:</span>
                    <span className="text-green-600 font-semibold">
                      {formData.currency === 'CAD' ? '$' : '₹'}
                      {(formData.basePrice * (formData.discount / 100)).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Inventory Management */}
            <div className="p-4 bg-purple-50 rounded-xl border-2 border-purple-200">
              <h3 className="font-bold text-lg text-purple-900 mb-4 flex items-center gap-2">
                <Package size={20} />
                Inventory & Limits
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Stock Quantity
                  </label>
                  <input
                    type="number"
                    placeholder="Leave empty for unlimited"
                    min="0"
                    value={formData.stock || ''}
                    onChange={e => setFormData({...formData, stock: e.target.value ? parseInt(e.target.value) : undefined})}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Min Order (kg)
                  </label>
                  <input
                    type="number"
                    placeholder="0.5"
                    min="0.5"
                    step="0.5"
                    value={formData.minOrder}
                    onChange={e => setFormData({...formData, minOrder: parseFloat(e.target.value) || 0.5})}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Max Order (kg)
                  </label>
                  <input
                    type="number"
                    placeholder="10"
                    min="1"
                    value={formData.maxOrder}
                    onChange={e => setFormData({...formData, maxOrder: parseFloat(e.target.value) || 10})}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Tags & Keywords */}
            <div className="p-4 bg-orange-50 rounded-xl border-2 border-orange-200">
              <h3 className="font-bold text-lg text-orange-900 mb-4 flex items-center gap-2">
                <Tag size={20} />
                Tags & SEO
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Product Tags (comma separated)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Chocolate, Premium, Birthday Special"
                    value={(formData.tags || []).join(', ')}
                    onChange={e => setFormData({...formData, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean)})}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
                  />
                  <div className="flex flex-wrap gap-2 mt-2">
                    {suggestedTags.map(tag => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          const currentTags = formData.tags || [];
                          if (!currentTags.includes(tag)) {
                            setFormData({...formData, tags: [...currentTags, tag]});
                          }
                        }}
                        className="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded-full hover:bg-orange-200 transition"
                      >
                        + {tag}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    SEO Keywords (comma separated)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., best chocolate cake, birthday cake online"
                    value={(formData.seoKeywords || []).join(', ')}
                    onChange={e => setFormData({...formData, seoKeywords: e.target.value.split(',').map(k => k.trim()).filter(Boolean)})}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>
            </div>

           {/* Delivery Pincodes */}
<div className="p-4 bg-cyan-50 rounded-xl border-2 border-cyan-200">
  <h3 className="font-bold text-lg text-cyan-900 mb-4 flex items-center gap-2">
    <MapPin size={20} />
    Delivery Areas
  </h3>

  {/* Selected pincodes */}
  <div className="mb-3">
    <label className="block text-sm font-semibold text-gray-700 mb-2">
      Selected Pincodes (leave empty to allow all areas)
    </label>
    {formData.deliveryPincodes?.length ? (
      <div className="flex flex-wrap gap-2">
        {formData.deliveryPincodes.map(pin => (
          <span
            key={pin}
            className="inline-flex items-center gap-1 px-3 py-1 bg-cyan-100 text-cyan-800 rounded-full text-xs font-semibold border border-cyan-200"
          >
            {pin}
            <button
              type="button"
              onClick={() => removePincode(pin)}
              className="ml-1 text-cyan-700 hover:text-cyan-900"
            >
              <X size={12} />
            </button>
          </span>
        ))}
      </div>
    ) : (
      <p className="text-xs text-gray-500">
        No specific pincodes selected. This product will follow global allowed pincodes.
      </p>
    )}
  </div>

  {/* Global/default pincodes from settings */}
  {!!globalPincodes.length && (
    <div className="mb-3">
      <p className="text-xs font-semibold text-gray-700 mb-1">
        Global Pincodes from Settings
      </p>
      <div className="flex flex-wrap gap-2">
        {globalPincodes.map(pin => {
          const active = formData.deliveryPincodes?.includes(pin);
          return (
            <button
              key={pin}
              type="button"
              onClick={() =>
                active
                  ? removePincode(pin)
                  : addPincodesFromString(pin)
              }
              className={`px-3 py-1 rounded-full text-xs font-semibold border transition ${
                active
                  ? 'bg-cyan-600 text-white border-cyan-700'
                  : 'bg-white text-cyan-700 border-cyan-300 hover:bg-cyan-50'
              }`}
            >
              {active ? '✓ ' : ''}{pin}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        onClick={() => addPincodesFromString(globalPincodes.join(','))}
        className="mt-2 text-xs text-cyan-700 underline"
      >
        Use all global pincodes
      </button>
    </div>
  )}

  {/* Add new pincodes */}
  <div>
    <label className="block text-sm font-semibold text-gray-700 mb-2">
      Add New Pincodes
    </label>
    <div className="flex gap-2">
      <input
        type="text"
        placeholder="e.g., 133001, 133002"
        value={pincodeInput}
        onChange={e => setPincodeInput(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            e.preventDefault();
            addPincodesFromString(pincodeInput);
          }
        }}
        className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
      />
      <button
        type="button"
        onClick={() => addPincodesFromString(pincodeInput)}
        className="px-4 py-3 bg-cyan-600 text-white rounded-xl font-semibold hover:bg-cyan-700 transition-all"
      >
        Add
      </button>
    </div>
    <p className="text-xs text-gray-500 mt-2">
      Tip: You can paste multiple pincodes separated by comma or space and press Enter.
    </p>
  </div>
</div>


            {/* Availability Schedule */}
            <div className="p-4 bg-teal-50 rounded-xl border-2 border-teal-200">
              <h3 className="font-bold text-lg text-teal-900 mb-4 flex items-center gap-2">
                <Calendar size={20} />
                Availability Schedule (Optional)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Available From
                  </label>
                  <input
                    type="date"
                    value={formData.availableFrom}
                    onChange={e => setFormData({...formData, availableFrom: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Available To
                  </label>
                  <input
                    type="date"
                    value={formData.availableTo}
                    onChange={e => setFormData({...formData, availableTo: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Featured Toggle */}
            <div className="p-4 bg-yellow-50 rounded-xl border-2 border-yellow-200">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.featured}
                  onChange={e => setFormData({...formData, featured: e.target.checked})}
                  className="w-5 h-5 text-yellow-600 border-2 border-yellow-400 rounded focus:ring-2 focus:ring-yellow-500"
                />
                <div>
                  <span className="font-bold text-yellow-900 flex items-center gap-2">
                    <Star size={20} className="fill-yellow-500 text-yellow-500" />
                    Mark as Featured Product
                  </span>
                  <p className="text-sm text-yellow-700">Featured products appear on homepage and get priority display</p>
                </div>
              </label>
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                className="flex-1 bg-gradient-to-r from-pink-600 to-purple-600 text-white px-6 py-4 rounded-xl hover:from-pink-700 hover:to-purple-700 transition-all font-bold text-lg transform hover:scale-105 shadow-lg flex items-center justify-center gap-2"
              >
                <Save size={20} />
                {editingProduct ? 'Update Product' : 'Add Product'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="flex-1 bg-gray-200 text-gray-700 px-6 py-4 rounded-xl hover:bg-gray-300 transition-all font-semibold text-lg"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search, Filter & Actions Bar */}
      <div className="bg-white rounded-2xl shadow-lg p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-5 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by name, category, tags..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
            />
          </div>
          <div className="md:col-span-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
            >
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <select
              value={featuredFilter}
              onChange={(e) => setFeaturedFilter(e.target.value as any)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
            >
              <option value="all">All Products</option>
              <option value="featured">Featured Only</option>
              <option value="regular">Regular Only</option>
            </select>
          </div>
          <div className="md:col-span-3">
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [newSortBy, newSortOrder] = e.target.value.split('-') as [typeof sortBy, typeof sortOrder];
                setSortBy(newSortBy);
                setSortOrder(newSortOrder);
              }}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
            >
              <option value="date-desc">Newest First</option>
              <option value="date-asc">Oldest First</option>
              <option value="name-asc">Name (A-Z)</option>
              <option value="name-desc">Name (Z-A)</option>
              <option value="price-asc">Price (Low-High)</option>
              <option value="price-desc">Price (High-Low)</option>
              <option value="orders-desc">Most Orders</option>
              <option value="stock-asc">Low Stock First</option>
            </select>
          </div>
        </div>

        {/* Advanced Filters Toggle */}
        <button
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          className="flex items-center gap-2 text-pink-600 font-semibold hover:text-pink-700 transition"
        >
          <Filter size={16} />
          Advanced Filters
          {showAdvancedFilters ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {/* Advanced Filters */}
        {showAdvancedFilters && (
          <div className="p-4 bg-gray-50 rounded-xl border-2 border-gray-200 animate-scale-up">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Stock Status</label>
                <select
                  value={stockFilter}
                  onChange={(e) => setStockFilter(e.target.value as any)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
                >
                  <option value="all">All Stock Levels</option>
                  <option value="instock">In Stock (10+)</option>
                  <option value="lowstock">Low Stock (1-10)</option>
                  <option value="outofstock">Out of Stock</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Actions Row */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setBulkDeleteMode(!bulkDeleteMode);
                setSelectedProducts(new Set());
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${
                bulkDeleteMode 
                  ? 'bg-red-100 text-red-700 border-2 border-red-200' 
                  : 'bg-gray-100 text-gray-700 border-2 border-gray-200'
              }`}
            >
              <CheckSquare size={18} />
              {bulkDeleteMode ? 'Cancel Selection' : 'Select Multiple'}
            </button>

            {bulkDeleteMode && (
              <>
                <button
                  onClick={selectAllProducts}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg font-semibold border-2 border-blue-200"
                >
                  {selectedProducts.size === filteredProducts.length ? 'Deselect All' : 'Select All'}
                </button>
                {selectedProducts.size > 0 && (
                  <button
                    onClick={handleBulkDelete}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 shadow-lg"
                  >
                    <Trash size={18} />
                    Delete ({selectedProducts.size})
                  </button>
                )}
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 font-medium">View:</span>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-all ${
                viewMode === 'grid' 
                  ? 'bg-pink-600 text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title="Grid View"
            >
              <Grid3x3 size={20} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-all ${
                viewMode === 'list' 
                  ? 'bg-pink-600 text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title="List View"
            >
              <List size={20} />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-lg transition-all ${
                viewMode === 'table' 
                  ? 'bg-pink-600 text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title="Table View"
            >
              <FileSpreadsheet size={20} />
            </button>
          </div>
        </div>
      </div>
      
      {/* Products Display */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
          <Package className="mx-auto text-gray-300 mb-4" size={64} />
          <p className="text-gray-500 text-lg font-semibold">No products found</p>
          <p className="text-gray-400 text-sm mt-2">Try adjusting your filters or add a new product</p>
        </div>
      ) : viewMode === 'table' ? (
        // Table View
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-pink-50 to-purple-50">
                <tr>
                  {bulkDeleteMode && (
                    <th className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedProducts.size === filteredProducts.length}
                        onChange={selectAllProducts}
                        className="w-5 h-5"
                      />
                    </th>
                  )}
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Image</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Price</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Discount</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Final Price</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Stock</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Orders</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredProducts.map((product, index) => {
  const finalPrice = calculateDiscountedPrice(product.basePrice || 0, product.discount || 0);
  const stockStatus = product.stock === undefined ? 'unlimited' : 
                                     product.stock === 0 ? 'out' : 
                                     product.stock <= 10 ? 'low' : 'in';
                  
                  return (
                    <tr
    key={product.id}
    ref={el => {
      if (product.id) productRefs.current[product.id] = el as HTMLTableRowElement;
    }}
    className="hover:bg-gray-50 transition"
  >
                      {bulkDeleteMode && (
        <td className="px-4 py-3">
          <input
            type="checkbox"
            checked={selectedProducts.has(product.id!)}
            onChange={() => toggleSelectProduct(product.id!)}
            className="w-5 h-5"
          />
        </td>
      )}
                      <td className="px-4 py-3">
                        <div className="relative w-16 h-16 rounded-lg overflow-hidden">
                          <Image
                            src={product.imageUrl || 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600'}
                            alt={product.name}
                            fill
                            className="object-cover"
                            sizes="64px"
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-semibold text-gray-800">{product.name}</p>
                          {product.featured && (
                            <span className="inline-flex items-center gap-1 text-xs text-yellow-700 mt-1">
                              <Star size={12} className="fill-yellow-500" />
                              Featured
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-lg text-xs font-semibold">
                          {product.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold">
                        {product.currency === 'CAD' ? '$' : '₹'}{product.basePrice}
                      </td>
                      <td className="px-4 py-3">
                        {product.discount && product.discount > 0 ? (
                          <span className="px-2 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-bold">
                            {product.discount}% OFF
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-bold text-pink-600">
                        {product.currency === 'CAD' ? '$' : '₹'}{finalPrice.toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        {stockStatus === 'unlimited' ? (
                          <span className="text-green-600 text-xs font-semibold">Unlimited</span>
                        ) : stockStatus === 'out' ? (
                          <span className="px-2 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-bold">Out</span>
                        ) : stockStatus === 'low' ? (
                          <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-lg text-xs font-bold">{product.stock}</span>
                        ) : (
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-bold">{product.stock}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1 text-sm font-semibold text-gray-700">
                          <TrendingUp size={14} className="text-green-500" />
                          {product.orderCount || 0}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleFeatured(product)}
                          className={`p-2 rounded-lg transition ${
                            product.featured 
                              ? 'bg-yellow-100 text-yellow-700' 
                              : 'bg-gray-100 text-gray-400'
                          }`}
                          title={product.featured ? 'Remove from featured' : 'Add to featured'}
                        >
                          <Star size={16} className={product.featured ? 'fill-current' : ''} />
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button
                            onClick={() => editProduct(product)}
                            className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition"
                            title="Edit"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => duplicateProduct(product)}
                            className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition"
                            title="Duplicate"
                          >
                            <Copy size={16} />
                          </button>
                          {product.id && (
                            <button
                              onClick={() => setConfirmModal({ show: true, id: product.id!, name: product.name, isBulk: false })}
                              className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition"
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        // Grid/List View (existing code continues...)
        <div className={viewMode === 'grid' 
          ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' 
          : 'space-y-4'
        }>
          {filteredProducts.map((product) => {
            const finalPrice = calculateDiscountedPrice(product.basePrice || 0, product.discount || 0);
            const stockStatus = product.stock === undefined ? 'unlimited' : 
                               product.stock === 0 ? 'out' : 
                               product.stock <= 10 ? 'low' : 'in';
 return (  
  <div
    key={product.id}
    ref={el => {
      if (product.id) productRefs.current[product.id] = el;
    }}
    className={`bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all ${
      viewMode === 'grid' ? 'transform hover:-translate-y-1' : ''
    } ${
      selectedProducts.has(product.id!) ? 'ring-4 ring-pink-500' : ''
    }`}
  >
                {viewMode === 'grid' ? (
                  // Grid View Card
                  <>
                    <div className="relative h-48 w-full">
                      {bulkDeleteMode && (
                        <div className="absolute top-3 left-3 z-10">
                          <button
                            onClick={() => toggleSelectProduct(product.id!)}
                            className="p-2 bg-white rounded-lg shadow-lg"
                          >
                            {selectedProducts.has(product.id!) ? (
                              <CheckSquare className="text-pink-600" size={24} />
                            ) : (
                              <Square className="text-gray-400" size={24} />
                            )}
                          </button>
                        </div>
                      )}
                      <Image 
                        src={product.imageUrl || 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600'} 
                        alt={product.name} 
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                      
                      {/* Top Right Badges */}
                      <div className="absolute top-3 right-3 flex flex-col gap-2">
                        {product.featured && (
                          <span className="px-2 py-1 bg-yellow-400 text-gray-900 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg">
                            <Star size={12} className="fill-current" />
                            Featured
                          </span>
                        )}
                        {product.discount && product.discount > 0 && (
                          <span className="px-2 py-1 bg-red-600 text-white rounded-full text-xs font-bold shadow-lg">
                            {product.discount}% OFF
                          </span>
                        )}
                        <span className="px-2 py-1 bg-white/90 backdrop-blur-sm rounded-full text-xs font-bold text-gray-800 border-2 border-white">
                          {product.category}
                        </span>
                      </div>

                      {/* Stock Badge */}
                      <div className="absolute bottom-3 left-3">
                        {stockStatus === 'out' && (
                          <span className="px-2 py-1 bg-red-600 text-white rounded-full text-xs font-bold">
                            Out of Stock
                          </span>
                        )}
                        {stockStatus === 'low' && (
                          <span className="px-2 py-1 bg-orange-500 text-white rounded-full text-xs font-bold">
                            Only {product.stock} left!
                          </span>
                        )}
                      </div>

                      {/* Images Count */}
                      {product.images && product.images.length > 0 && (
                        <div className="absolute bottom-3 right-3">
                          <span className="px-2 py-1 bg-purple-600 text-white rounded-full text-xs font-bold flex items-center gap-1">
                            <Images size={12} />
                            +{product.images.length}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <div className="p-5">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-bold text-xl text-gray-800 line-clamp-1 flex-1">{product.name}</h3>
                        <button
                          onClick={() => toggleFeatured(product)}
                          className="ml-2 flex-shrink-0"
                          title={product.featured ? 'Remove from featured' : 'Add to featured'}
                        >
                          <Star 
                            size={20} 
                            className={product.featured ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'} 
                          />
                        </button>
                      </div>
                      
                      <p className="text-gray-600 text-sm mb-4 line-clamp-2">{product.description}</p>

                      {/* Tags */}
                      {product.tags && product.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {product.tags.slice(0, 3).map((tag, idx) => (
                            <span key={idx} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">
                              {tag}
                            </span>
                          ))}
                          {product.tags.length > 3 && (
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">
                              +{product.tags.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">
                            {product.discount && product.discount > 0 ? (
                              <>
                                <span className="line-through mr-2">
                                  {product.currency === 'CAD' ? '$' : '₹'}{product.basePrice}
                                </span>
                                <span className="text-green-600 font-semibold">
                                  Save {product.currency === 'CAD' ? '$' : '₹'}
                                  {((product.basePrice || 0) - finalPrice).toFixed(2)}
                                </span>
                              </>
                            ) : (
                              'Price'
                            )}
                          </p>
                          <p className="text-2xl font-bold text-pink-600">
                            {product.currency === 'CAD' ? '$' : '₹'}{finalPrice.toFixed(2)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500 mb-1">Orders</p>
                          <p className="text-lg font-bold text-gray-800 flex items-center gap-1">
                            <TrendingUp size={16} className="text-green-500" />
                            {product.orderCount || 0}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <button
                          onClick={() => editProduct(product)}
                          className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-blue-100 text-blue-700 rounded-xl hover:bg-blue-200 transition-all font-semibold transform hover:scale-105 border-2 border-blue-200"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => duplicateProduct(product)}
                          className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-green-100 text-green-700 rounded-xl hover:bg-green-200 transition-all font-semibold transform hover:scale-105 border-2 border-green-200"
                        >
                          <Copy size={16} />
                        </button>
                        {product.id && (
                          <button
                            onClick={() => setConfirmModal({ show: true, id: product.id!, name: product.name, isBulk: false })}
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-red-100 text-red-700 rounded-xl hover:bg-red-200 transition-all font-semibold transform hover:scale-105 border-2 border-red-200"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  // List View
                  <div className="flex items-center gap-4 p-4">
                    {bulkDeleteMode && (
                      <button
                        onClick={() => toggleSelectProduct(product.id!)}
                        className="p-2"
                      >
                        {selectedProducts.has(product.id!) ? (
                          <CheckSquare className="text-pink-600" size={24} />
                        ) : (
                          <Square className="text-gray-400" size={24} />
                        )}
                      </button>
                    )}
                    
                    <div className="relative w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden">
                      <Image 
                        src={product.imageUrl || 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600'} 
                        alt={product.name} 
                        fill
                        className="object-cover"
                        sizes="96px"
                      />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2 mb-1">
                        <h3 className="font-bold text-lg text-gray-800 flex-1">{product.name}</h3>
                        <button
                          onClick={() => toggleFeatured(product)}
                          title={product.featured ? 'Remove from featured' : 'Add to featured'}
                        >
                          <Star 
                            size={18} 
                            className={product.featured ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'} 
                          />
                        </button>
                      </div>
                      <p className="text-gray-600 text-sm mb-2 line-clamp-1">{product.description}</p>
                      <div className="flex items-center gap-4 flex-wrap">
                        <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-lg text-xs font-bold">
                          {product.category}
                        </span>
                        <span className="text-lg font-bold text-pink-600">
                          {product.currency === 'CAD' ? '$' : '₹'}{finalPrice.toFixed(2)}
                        </span>
                        {product.discount && product.discount > 0 && (
                          <span className="px-2 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-bold">
                            {product.discount}% OFF
                          </span>
                        )}
                        <span className="text-sm text-gray-600 flex items-center gap-1">
                          <TrendingUp size={14} className="text-green-500" />
                          {product.orderCount || 0} orders
                        </span>
                        {stockStatus === 'low' && (
                          <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-lg text-xs font-bold">
                            Low Stock ({product.stock})
                          </span>
                        )}
                        {stockStatus === 'out' && (
                          <span className="px-2 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-bold">
                            Out of Stock
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => editProduct(product)}
                        className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-all"
                        title="Edit"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => duplicateProduct(product)}
                        className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-all"
                        title="Duplicate"
                      >
                        <Copy size={18} />
                      </button>
                      {product.id && (
                        <button
                          onClick={() => setConfirmModal({ show: true, id: product.id!, name: product.name, isBulk: false })}
                          className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-all"
                          title="Delete"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <style jsx global>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes scale-up {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        .animate-fade-in {
          animation: fade-in 0.6s ease-out;
        }
        
        .animate-scale-up {
          animation: scale-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
