'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { adminLoginPathFromPathname } from '../lib/adminPublicPath';
import { migrateLegacyStoredContactAddress } from '../lib/siteContact';
import { SITE_DATA_UPDATED_EVENT } from '../lib/cmsSiteClient';

interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  duration: number; // Duration in minutes
}

interface Employee {
  id: string;
  name: string;
  role: 'Water' | 'Powder' | 'Everything';
  phone: string;
}

interface Booking {
  id: string;
  name: string;
  phone: string;
  service: string;
  employee?: string;
  date: string;
  timeSlot: string; // Format: "HH:MM"
  duration: number;
}

export default function AdminPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState<'gallery' | 'services' | 'about' | 'contact' | 'bookings' | 'employees'>('gallery');
  const [services, setServices] = useState<Service[]>([]);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  
  // Content management
  const [aboutContent, setAboutContent] = useState({ title: '', content: '' });
  const [contactContent, setContactContent] = useState({ 
    address: '', 
    phone: '', 
    email: '', 
    hours: '',
    socialMedia: { facebook: '', instagram: '', twitter: '' }
  });
  
  // Forms
  const [serviceForm, setServiceForm] = useState({ name: '', description: '', price: '', category: '', duration: '45' });
  const [newCategory, setNewCategory] = useState('');
  const [employeeForm, setEmployeeForm] = useState({ name: '', role: '' as 'Water' | 'Powder' | 'Everything' | '', phone: '' });
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  /** When true, services/employees/bookings/about/contact sync to S3 via PUT /api/cms/site */
  const [useCms, setUseCms] = useState(false);

  // Authentication is handled by admin layout

  const persistSiteSnapshot = async (partial: {
    services?: Service[];
    employees?: Employee[];
    bookings?: Booking[];
    about?: typeof aboutContent;
    contact?: typeof contactContent;
    gallery?: string[];
  }) => {
    const nextServices = partial.services ?? services;
    const nextEmployees = partial.employees ?? employees;
    const nextBookings = partial.bookings ?? bookings;
    const nextAbout = partial.about ?? aboutContent;
    const nextContact = partial.contact ?? contactContent;
    const nextGallery = partial.gallery ?? galleryImages;

    if (!useCms) {
      if (partial.services !== undefined) {
        localStorage.setItem('admin-services', JSON.stringify(nextServices));
      }
      if (partial.employees !== undefined) {
        localStorage.setItem('admin-employees', JSON.stringify(nextEmployees));
      }
      if (partial.bookings !== undefined) {
        localStorage.setItem('admin-bookings', JSON.stringify(nextBookings));
      }
      if (partial.about !== undefined) {
        localStorage.setItem('admin-about', JSON.stringify(nextAbout));
      }
      if (partial.contact !== undefined) {
        localStorage.setItem('admin-contact', JSON.stringify(nextContact));
      }
      if (partial.gallery !== undefined) {
        localStorage.setItem('admin-gallery', JSON.stringify(nextGallery));
      }
      if (partial.contact !== undefined) {
        window.dispatchEvent(new Event(SITE_DATA_UPDATED_EVENT));
      }
      return;
    }

    const res = await fetch('/api/cms/site', {
      method: 'PUT',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        version: 1,
        services: nextServices,
        employees: nextEmployees,
        bookings: nextBookings,
        about: nextAbout,
        contact: nextContact,
        gallery: nextGallery,
      }),
    });
    if (!res.ok) {
      const msg = await res.text().catch(() => '');
      alert(`Could not save to cloud (${res.status}). ${msg || 'Check S3 env vars on the server.'}`);
      return;
    }
    if (partial.contact !== undefined) {
      try {
        localStorage.setItem('admin-contact', JSON.stringify(nextContact));
      } catch {
        /* ignore */
      }
      window.dispatchEvent(new Event(SITE_DATA_UPDATED_EVENT));
    }
  };

  // Load: S3 CMS when configured, else localStorage (gallery stays local until step 5)
  useEffect(() => {
    migrateLegacyStoredContactAddress();
    let cancelled = false;

    (async () => {
      try {
        const r = await fetch('/api/cms/site');
        const data = await r.json();
        if (cancelled) return;

        if (data.configured === true && data.site && !data.error) {
          const s = data.site;
          setUseCms(true);
          if (Array.isArray(s.services)) setServices(s.services as Service[]);
          if (Array.isArray(s.employees)) setEmployees(s.employees as Employee[]);
          if (Array.isArray(s.bookings)) setBookings(s.bookings as Booking[]);
          if (s.about && typeof s.about === 'object') {
            setAboutContent((prev) => ({ ...prev, ...s.about }));
          }
          if (s.contact && typeof s.contact === 'object') {
            const c = s.contact as typeof contactContent;
            setContactContent((prev) => ({
              ...prev,
              ...c,
              socialMedia: { ...prev.socialMedia, ...(c.socialMedia || {}) },
            }));
          }
          if (Array.isArray(s.gallery) && s.gallery.length > 0) {
            setGalleryImages(s.gallery as string[]);
          }
        } else {
          const savedServices = localStorage.getItem('admin-services');
          const savedBookings = localStorage.getItem('admin-bookings');
          const savedEmployees = localStorage.getItem('admin-employees');
          const savedAbout = localStorage.getItem('admin-about');
          const savedContact = localStorage.getItem('admin-contact');
          if (savedServices) setServices(JSON.parse(savedServices));
          if (savedBookings) setBookings(JSON.parse(savedBookings));
          if (savedEmployees) setEmployees(JSON.parse(savedEmployees));
          if (savedAbout) setAboutContent(JSON.parse(savedAbout));
          if (savedContact) setContactContent(JSON.parse(savedContact));
        }
      } catch {
        if (!cancelled) {
          const savedServices = localStorage.getItem('admin-services');
          const savedBookings = localStorage.getItem('admin-bookings');
          const savedEmployees = localStorage.getItem('admin-employees');
          const savedAbout = localStorage.getItem('admin-about');
          const savedContact = localStorage.getItem('admin-contact');
          if (savedServices) setServices(JSON.parse(savedServices));
          if (savedBookings) setBookings(JSON.parse(savedBookings));
          if (savedEmployees) setEmployees(JSON.parse(savedEmployees));
          if (savedAbout) setAboutContent(JSON.parse(savedAbout));
          if (savedContact) setContactContent(JSON.parse(savedContact));
        }
      }

      if (cancelled) return;
      const savedGallery = localStorage.getItem('admin-gallery');
      if (savedGallery) {
        try {
          const g = JSON.parse(savedGallery) as string[];
          if (Array.isArray(g) && g.length > 0) {
            setGalleryImages((prev) => (prev.length > 0 ? prev : g));
          }
        } catch {
          /* ignore */
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  /** If S3 site has no gallery yet but this browser still has admin-gallery, publish once (logged-in admin). */
  useEffect(() => {
    if (!useCms) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch('/api/cms/site', { credentials: 'same-origin' });
        const d = await r.json();
        if (cancelled || !d.configured || !d.site) return;
        const remoteG = d.site.gallery;
        if (Array.isArray(remoteG) && remoteG.length > 0) return;
        const raw = localStorage.getItem('admin-gallery');
        if (!raw) return;
        const local = JSON.parse(raw) as unknown;
        if (!Array.isArray(local) || local.length === 0) return;
        const urls = local.filter((x): x is string => typeof x === 'string' && x.trim() !== '');
        if (urls.length === 0) return;
        const s = d.site as Record<string, unknown>;
        const put = await fetch('/api/cms/site', {
          method: 'PUT',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            version: typeof s.version === 'number' ? s.version : 1,
            services: Array.isArray(s.services) ? s.services : [],
            employees: Array.isArray(s.employees) ? s.employees : [],
            bookings: Array.isArray(s.bookings) ? s.bookings : [],
            about: s.about && typeof s.about === 'object' ? s.about : { title: '', content: '' },
            contact:
              s.contact && typeof s.contact === 'object'
                ? s.contact
                : {
                    address: '',
                    phone: '',
                    email: '',
                    hours: '',
                    socialMedia: { facebook: '', instagram: '', twitter: '' },
                  },
            gallery: urls,
          }),
        });
        if (put.ok) setGalleryImages(urls);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [useCms]);

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST', credentials: 'same-origin' });
    } catch {
      /* still navigate away */
    }
    router.push(adminLoginPathFromPathname(pathname));
    router.refresh();
  };

  // Gallery Management
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await fetch('/api/admin/upload', {
        method: 'POST',
        credentials: 'same-origin',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        const newImages = [...galleryImages, data.url];
        setGalleryImages(newImages);
        void persistSiteSnapshot({ gallery: newImages });
        alert('Image uploaded successfully!');
      } else {
        alert('Failed to upload image');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Error uploading image');
    }
  };

  const deleteGalleryImage = (index: number) => {
    if (confirm('Are you sure you want to delete this image?')) {
      const newImages = galleryImages.filter((_, i) => i !== index);
      setGalleryImages(newImages);
      void persistSiteSnapshot({ gallery: newImages });
    }
  };

  // Get unique categories from existing services
  const getCategories = () => {
    const cats = services.map(s => s.category).filter(c => c && c.trim() !== '');
    return Array.from(new Set(cats));
  };

  /** Empty → 45; 0 allowed (hides duration on Services list); invalid → 45 */
  const parseDurationFromForm = (raw: string): number => {
    const t = (raw ?? '').trim();
    if (t === '') return 45;
    const n = parseInt(t, 10);
    if (!Number.isFinite(n) || n < 0) return 45;
    return n;
  };

  // Services Management
  const saveService = () => {
    if (!serviceForm.name || !serviceForm.price) {
      alert('Please fill in all required fields');
      return;
    }

    const categoryResolved =
      (serviceForm.category || '').trim() || (newCategory || '').trim();
    if (!categoryResolved) {
      alert(
        'Please choose a category from the dropdown, or type a new category and click Use (or press Enter).'
      );
      return;
    }

    const duration = parseDurationFromForm(serviceForm.duration);

    if (editingService) {
      const updated = services.map(s =>
        s.id === editingService.id
          ? {
              ...editingService,
              ...serviceForm,
              category: categoryResolved,
              price: parseFloat(serviceForm.price),
              duration,
            }
          : s
      );
      setServices(updated);
      void persistSiteSnapshot({ services: updated });
      setEditingService(null);
    } else {
      const newService: Service = {
        id: Date.now().toString(),
        name: serviceForm.name,
        description: serviceForm.description,
        price: parseFloat(serviceForm.price),
        category: categoryResolved,
        duration,
      };
      const updated = [...services, newService];
      setServices(updated);
      void persistSiteSnapshot({ services: updated });
    }
    setServiceForm({ name: '', description: '', price: '', category: '', duration: '45' });
    setNewCategory('');
  };

  const editService = (service: Service) => {
    setEditingService(service);
    setServiceForm({
      name: service.name,
      description: service.description,
      price: String(
        typeof service.price === 'number' ? service.price : parseFloat(String(service.price)) || 0
      ),
      category: service.category || '',
      duration:
        service.duration != null && Number.isFinite(service.duration) && service.duration >= 0
          ? String(service.duration)
          : '45',
    });
  };

  const deleteService = (id: string) => {
    if (confirm('Are you sure you want to delete this service?')) {
      const updated = services.filter(s => s.id !== id);
      setServices(updated);
      void persistSiteSnapshot({ services: updated });
    }
  };

  // Employees Management
  const saveEmployee = () => {
    if (!employeeForm.name || !employeeForm.role || !employeeForm.phone) {
      alert('Please fill in all required fields');
      return;
    }

    if (editingEmployee) {
      const updated = employees.map(e => 
        e.id === editingEmployee.id 
          ? { ...editingEmployee, ...employeeForm, role: employeeForm.role as 'Water' | 'Powder' | 'Everything' }
          : e
      );
      setEmployees(updated);
      void persistSiteSnapshot({ employees: updated });
      setEditingEmployee(null);
    } else {
      const newEmployee: Employee = {
        id: Date.now().toString(),
        name: employeeForm.name,
        role: employeeForm.role as 'Water' | 'Powder' | 'Everything',
        phone: employeeForm.phone,
      };
      const updated = [...employees, newEmployee];
      setEmployees(updated);
      void persistSiteSnapshot({ employees: updated });
    }
    setEmployeeForm({ name: '', role: '', phone: '' });
  };

  const editEmployee = (employee: Employee) => {
    setEditingEmployee(employee);
    setEmployeeForm({
      name: employee.name,
      role: employee.role,
      phone: employee.phone,
    });
  };

  const deleteEmployee = (id: string) => {
    if (confirm('Are you sure you want to delete this employee?')) {
      const updated = employees.filter(e => e.id !== id);
      setEmployees(updated);
      void persistSiteSnapshot({ employees: updated });
    }
  };

  // About Management
  const saveAbout = () => {
    void persistSiteSnapshot({ about: aboutContent });
    alert('About page updated successfully!');
  };

  // Contact Management
  const saveContact = () => {
    void persistSiteSnapshot({ contact: contactContent });
    alert('Contact page updated successfully!');
  };

  // Delete Booking
  const deleteBooking = (id: string) => {
    if (confirm('Are you sure you want to delete this booking?')) {
      const updated = bookings.filter(b => b.id !== id);
      setBookings(updated);
      void persistSiteSnapshot({ bookings: updated });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-neutral-950 via-neutral-900 to-champagne-950 px-6 py-6 flex justify-between items-center border-b border-champagne-600/25">
            <div>
              <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
              <p className="text-champagne-200 mt-2">Manage your nail salon website</p>
              {useCms && (
                <p className="text-champagne-300/90 text-sm mt-1">
                  Site data (services, staff, bookings, about, contact) is saved to Amazon S3.
                </p>
              )}
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-champagne-400 text-neutral-950 rounded-md hover:bg-champagne-300 transition font-semibold"
            >
              Logout
            </button>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 overflow-x-auto">
            <nav className="flex -mb-px">
              {(['gallery', 'services', 'about', 'contact', 'bookings', 'employees'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-4 font-medium text-sm whitespace-nowrap ${
                    activeTab === tab
                      ? 'border-b-2 border-champagne-500 text-champagne-600'
                      : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Gallery Tab */}
            {activeTab === 'gallery' && (
              <div>
                <h2 className="text-2xl font-semibold text-gray-800 mb-4">Gallery Management</h2>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center mb-6">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="image-upload"
                  />
                  <label
                    htmlFor="image-upload"
                    className="cursor-pointer inline-flex items-center px-4 py-2 bg-champagne-500 text-white rounded-lg hover:bg-champagne-600 transition"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Upload Image
                  </label>
                  <p className="text-gray-500 text-sm mt-2">Click to upload images to gallery</p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {galleryImages.map((url, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={url}
                        alt={`Nail salon gallery image ${index + 1} - Perfect Nails professional nail art work`}
                        className="w-full h-48 object-cover rounded-lg"
                      />
                      <button
                        onClick={() => deleteGalleryImage(index)}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
                {galleryImages.length === 0 && (
                  <p className="text-gray-500 text-center py-8">No images uploaded yet</p>
                )}
              </div>
            )}

            {/* Services Tab */}
            {activeTab === 'services' && (
              <div>
                <h2 className="text-2xl font-semibold text-gray-800 mb-4">Services Management</h2>
                
                <div className="bg-gray-50 rounded-lg p-6 mb-6">
                  <h3 className="text-lg font-semibold mb-4">
                    {editingService ? 'Edit Service' : 'Add New Service'}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Service Name *</label>
                      <input
                        type="text"
                        value={serviceForm.name}
                        onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-champagne-500 focus:border-champagne-500"
                        placeholder="e.g., Manicure"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Price ($) *</label>
                      <input
                        type="number"
                        step="0.01"
                        value={serviceForm.price}
                        onChange={(e) => setServiceForm({ ...serviceForm, price: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-champagne-500 focus:border-champagne-500"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes) *</label>
                      <input
                        type="number"
                        value={serviceForm.duration}
                        onChange={(e) => setServiceForm({ ...serviceForm, duration: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-champagne-500 focus:border-champagne-500"
                        placeholder="45"
                        min="0"
                        step="1"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Leave empty for 45 min default. Use <strong>0</strong> to hide time on the public Services page
                        (booking still uses 45 min for scheduling).
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                      <div className="flex gap-2">
                        <select
                          value={serviceForm.category}
                          onChange={(e) => setServiceForm({ ...serviceForm, category: e.target.value })}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-champagne-500 focus:border-champagne-500"
                        >
                          <option value="">Select or create category</option>
                          {getCategories().map((cat) => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={newCategory}
                          onChange={(e) => setNewCategory(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (newCategory.trim()) {
                                setServiceForm({ ...serviceForm, category: newCategory.trim() });
                                setNewCategory('');
                              }
                            }
                          }}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-champagne-500 focus:border-champagne-500"
                          placeholder="Or type new category"
                        />
                        {newCategory.trim() && (
                          <button
                            type="button"
                            onClick={() => {
                              setServiceForm({ ...serviceForm, category: newCategory.trim() });
                              setNewCategory('');
                            }}
                            className="px-3 py-2 bg-champagne-500 text-white rounded-md hover:bg-champagne-600 transition text-sm"
                          >
                            Use
                          </button>
                        )}
                      </div>
                      {serviceForm.category && (
                        <p className="text-xs text-gray-500 mt-1">Selected: <span className="font-semibold">{serviceForm.category}</span></p>
                      )}
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                      <textarea
                        value={serviceForm.description}
                        onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-champagne-500 focus:border-champagne-500"
                        rows={3}
                        placeholder="Service description..."
                      />
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={saveService}
                      className="px-4 py-2 bg-champagne-500 text-white rounded-md hover:bg-champagne-600 transition"
                    >
                      {editingService ? 'Update Service' : 'Add Service'}
                    </button>
                    {editingService && (
                      <button
                        onClick={() => {
                          setEditingService(null);
                          setServiceForm({ name: '', description: '', price: '', category: '', duration: '45' });
                          setNewCategory('');
                        }}
                        className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>

                {/* Services grouped by category */}
                {(() => {
                  const categories = getCategories();
                  const uncategorized = services.filter(s => !s.category || s.category.trim() === '');
                  
                  return (
                    <div className="space-y-6">
                      {categories.map((category) => {
                        const categoryServices = services.filter(s => s.category === category);
                        return (
                          <div key={category} className="border border-gray-200 rounded-lg p-4">
                            <h3 className="text-xl font-semibold text-champagne-600 mb-4 pb-2 border-b border-gray-200">
                              {category}
                            </h3>
                            <div className="space-y-3">
                              {categoryServices.map((service) => (
                                <div key={service.id} className="bg-gray-50 rounded-lg p-4 flex justify-between items-start">
                                  <div className="flex-1">
                                    <h4 className="font-semibold text-lg text-gray-800">{service.name}</h4>
                                    <p className="text-gray-600 text-sm mt-1">{service.description || 'No description'}</p>
                                    <div className="flex items-center gap-3 mt-2">
                                      <p className="text-champagne-600 font-semibold">
                                      $
                                      {Number(
                                        typeof service.price === 'number'
                                          ? service.price
                                          : parseFloat(String(service.price))
                                      ).toFixed(2)}
                                    </p>
                                      {service.duration !== 0 && (
                                        <p className="text-gray-500 text-sm">({service.duration || 45} min)</p>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex gap-2 ml-4">
                                    <button
                                      onClick={() => editService(service)}
                                      className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition text-sm"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      onClick={() => deleteService(service.id)}
                                      className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition text-sm"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                      
                      {uncategorized.length > 0 && (
                        <div className="border border-gray-200 rounded-lg p-4">
                          <h3 className="text-xl font-semibold text-gray-600 mb-4 pb-2 border-b border-gray-200">
                            Uncategorized
                          </h3>
                          <div className="space-y-3">
                            {uncategorized.map((service) => (
                              <div key={service.id} className="bg-gray-50 rounded-lg p-4 flex justify-between items-start">
                                <div className="flex-1">
                                  <h4 className="font-semibold text-lg text-gray-800">{service.name}</h4>
                                  <p className="text-gray-600 text-sm mt-1">{service.description || 'No description'}</p>
                                  <div className="flex items-center gap-3 mt-2">
                                    <p className="text-champagne-600 font-semibold">
                                      $
                                      {Number(
                                        typeof service.price === 'number'
                                          ? service.price
                                          : parseFloat(String(service.price))
                                      ).toFixed(2)}
                                    </p>
                                    {service.duration !== 0 && (
                                      <p className="text-gray-500 text-sm">({service.duration || 45} min)</p>
                                    )}
                                  </div>
                                </div>
                                <div className="flex gap-2 ml-4">
                                  <button
                                    onClick={() => editService(service)}
                                    className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition text-sm"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => deleteService(service.id)}
                                    className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition text-sm"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {services.length === 0 && (
                        <p className="text-gray-500 text-center py-8">No services added yet</p>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* About Tab */}
            {activeTab === 'about' && (
              <div>
                <h2 className="text-2xl font-semibold text-gray-800 mb-4">About Page Management</h2>
                <div className="bg-gray-50 rounded-lg p-6">
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                    <input
                      type="text"
                      value={aboutContent.title}
                      onChange={(e) => setAboutContent({ ...aboutContent, title: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-champagne-500 focus:border-champagne-500"
                      placeholder="About Us"
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
                    <textarea
                      value={aboutContent.content}
                      onChange={(e) => setAboutContent({ ...aboutContent, content: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-champagne-500 focus:border-champagne-500"
                      rows={10}
                      placeholder="Write about your nail salon..."
                    />
                  </div>
                  <button
                    onClick={saveAbout}
                    className="px-4 py-2 bg-champagne-500 text-white rounded-md hover:bg-champagne-600 transition"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            )}

            {/* Contact Tab */}
            {activeTab === 'contact' && (
              <div>
                <h2 className="text-2xl font-semibold text-gray-800 mb-4">Contact Page Management</h2>
                <div className="bg-gray-50 rounded-lg p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                      <input
                        type="text"
                        value={contactContent.address}
                        onChange={(e) => setContactContent({ ...contactContent, address: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-champagne-500 focus:border-champagne-500"
                        placeholder="123 Main St, Glendale, AZ"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                      <input
                        type="text"
                        value={contactContent.phone}
                        onChange={(e) => setContactContent({ ...contactContent, phone: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-champagne-500 focus:border-champagne-500"
                        placeholder="(623) 302-2156"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <input
                        type="email"
                        value={contactContent.email}
                        onChange={(e) => setContactContent({ ...contactContent, email: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-champagne-500 focus:border-champagne-500"
                        placeholder="info@perfectnails.com"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Business Hours
                        <span className="text-xs text-gray-500 ml-2">(One line per day or day range)</span>
                      </label>
                      <textarea
                        value={contactContent.hours}
                        onChange={(e) => setContactContent({ ...contactContent, hours: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-champagne-500 focus:border-champagne-500 font-mono text-sm"
                        placeholder="Monday - Friday: 9:00 AM - 7:00 PM
Saturday - Sunday: 10:00 AM - 6:00 PM"
                        rows={5}
                      />
                      <div className="mt-2 p-3 bg-gray-50 rounded-md">
                        <p className="text-xs font-semibold text-gray-700 mb-1">Format Example:</p>
                        <pre className="text-xs text-gray-600 whitespace-pre-wrap font-mono">
{`Monday - Friday: 9:00 AM - 7:00 PM
Saturday - Sunday: 10:00 AM - 6:00 PM`}
                        </pre>
                        <p className="text-xs text-gray-500 mt-2">
                          Each line should follow: <strong>Day Range: Time Range</strong>
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Social Media</label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Facebook</label>
                        <input
                          type="text"
                          value={contactContent.socialMedia.facebook}
                          onChange={(e) => setContactContent({ 
                            ...contactContent, 
                            socialMedia: { ...contactContent.socialMedia, facebook: e.target.value }
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-champagne-500 focus:border-champagne-500"
                          placeholder="Facebook URL"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Instagram</label>
                        <input
                          type="text"
                          value={contactContent.socialMedia.instagram}
                          onChange={(e) => setContactContent({ 
                            ...contactContent, 
                            socialMedia: { ...contactContent.socialMedia, instagram: e.target.value }
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-champagne-500 focus:border-champagne-500"
                          placeholder="Instagram URL"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Twitter</label>
                        <input
                          type="text"
                          value={contactContent.socialMedia.twitter}
                          onChange={(e) => setContactContent({ 
                            ...contactContent, 
                            socialMedia: { ...contactContent.socialMedia, twitter: e.target.value }
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-champagne-500 focus:border-champagne-500"
                          placeholder="Twitter URL"
                        />
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={saveContact}
                    className="px-4 py-2 bg-champagne-500 text-white rounded-md hover:bg-champagne-600 transition"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            )}

            {/* Bookings Tab */}
            {activeTab === 'bookings' && (
              <div>
                <h2 className="text-2xl font-semibold text-gray-800 mb-4">Bookings Management</h2>
                <div className="space-y-4">
                  {bookings.map((booking) => {
                    const bookingEmployee = booking.employee 
                      ? employees.find(e => e.id === booking.employee)
                      : null;
                    
                    return (
                      <div key={booking.id} className="border border-gray-200 rounded-lg p-4 flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-semibold text-lg text-gray-800">{booking.name}</h4>
                          <p className="text-gray-600 text-sm mt-1">Phone: {booking.phone}</p>
                          <p className="text-gray-600 text-sm">Service: {booking.service}</p>
                          {bookingEmployee && (
                            <p className="text-gray-600 text-sm">
                              Employee: <span className="font-semibold">{bookingEmployee.name}</span> ({bookingEmployee.role})
                            </p>
                          )}
                          <p className="text-gray-600 text-sm">
                            Time: {booking.timeSlot || new Date(booking.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({booking.duration || 45} min)
                          </p>
                          <p className="text-gray-500 text-xs mt-2">
                            Date: {new Date(booking.date).toLocaleDateString()}
                          </p>
                        </div>
                        <button
                          onClick={() => deleteBooking(booking.id)}
                          className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    );
                  })}
                  {bookings.length === 0 && (
                    <p className="text-gray-500 text-center py-8">No bookings yet</p>
                  )}
                </div>
              </div>
            )}

            {/* Employees Tab */}
            {activeTab === 'employees' && (
              <div>
                <h2 className="text-2xl font-semibold text-gray-800 mb-4">Employees Management</h2>
                
                <div className="bg-gray-50 rounded-lg p-6 mb-6">
                  <h3 className="text-lg font-semibold mb-4">
                    {editingEmployee ? 'Edit Employee' : 'Add New Employee'}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                      <input
                        type="text"
                        value={employeeForm.name}
                        onChange={(e) => setEmployeeForm({ ...employeeForm, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-champagne-500 focus:border-champagne-500"
                        placeholder="Employee name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                      <input
                        type="text"
                        value={employeeForm.phone}
                        onChange={(e) => setEmployeeForm({ ...employeeForm, phone: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-champagne-500 focus:border-champagne-500"
                        placeholder="(623) 302-2156"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
                      <select
                        value={employeeForm.role}
                        onChange={(e) => setEmployeeForm({ ...employeeForm, role: e.target.value as 'Water' | 'Powder' | 'Everything' })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-champagne-500 focus:border-champagne-500"
                      >
                        <option value="">Select a role</option>
                        <option value="Water">Water (Manicure & Pedicure only)</option>
                        <option value="Powder">Powder (Acrylic, Gel X, Gel Builder only)</option>
                        <option value="Everything">Everything (All services)</option>
                      </select>
                      {employeeForm.role && (
                        <p className="text-xs text-gray-500 mt-1">
                          {employeeForm.role === 'Water' && 'Can book: Manicure, Pedicure'}
                          {employeeForm.role === 'Powder' && 'Can book: Acrylic, Gel X, Gel Builder'}
                          {employeeForm.role === 'Everything' && 'Can book: All services'}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={saveEmployee}
                      className="px-4 py-2 bg-champagne-500 text-white rounded-md hover:bg-champagne-600 transition"
                    >
                      {editingEmployee ? 'Update Employee' : 'Add Employee'}
                    </button>
                    {editingEmployee && (
                      <button
                        onClick={() => {
                          setEditingEmployee(null);
                          setEmployeeForm({ name: '', role: '', phone: '' });
                        }}
                        className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  {employees.map((employee) => (
                    <div key={employee.id} className="border border-gray-200 rounded-lg p-4 flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-semibold text-lg text-gray-800">{employee.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="px-2 py-1 bg-champagne-100 text-champagne-700 rounded text-xs font-semibold">
                            {employee.role}
                          </span>
                        </div>
                        <p className="text-gray-600 text-sm mt-2">Phone: {employee.phone}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {employee.role === 'Water' && 'Services: Manicure, Pedicure'}
                          {employee.role === 'Powder' && 'Services: Acrylic, Gel X, Gel Builder'}
                          {employee.role === 'Everything' && 'Services: All services'}
                        </p>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => editEmployee(employee)}
                          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteEmployee(employee.id)}
                          className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                  {employees.length === 0 && (
                    <p className="text-gray-500 text-center py-8">No employees added yet</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
