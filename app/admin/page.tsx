'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { adminDashboardBaseFromPathname, adminLoginPathFromPathname } from '@/lib/admin/public-path';
import { addDays, formatWeekRangeLabel, mondayOfWeek, startOfLocalDay, toISODateString } from '@/lib/admin/week-calendar';
import { WeeklyHeader } from './bookings/components/WeeklyHeader';
import { WeekGrid } from './bookings/components/WeekGrid';
import { migrateLegacyStoredContactAddress, normalizeContactSocialMedia } from '@/lib/site/contact';
import { SITE_DATA_UPDATED_EVENT } from '@/lib/cms/site-client';
import { SITE_BRAND_NAME } from '@/lib/site/branding';
import {
  coerceBookingBlocksList,
  normalizeCmsBookingBlock,
  normalizeCmsGalleryList,
  type CmsBookingBlock,
  type CmsGalleryImage,
} from '@/lib/cmsSiteTypes';
import { galleryHasDedicatedThumb, galleryThumbSrc } from '@/lib/galleryDisplay';

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
  notes?: string;
}

export default function AdminPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState<'gallery' | 'services' | 'about' | 'contact' | 'bookings' | 'employees'>('gallery');
  const [services, setServices] = useState<Service[]>([]);
  const [galleryImages, setGalleryImages] = useState<CmsGalleryImage[]>([]);
  const [thumbMigrating, setThumbMigrating] = useState(false);
  const [thumbMigrateStatus, setThumbMigrateStatus] = useState('');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [bookingBlocks, setBookingBlocks] = useState<CmsBookingBlock[]>([]);
  const [bookingBlockDraft, setBookingBlockDraft] = useState({
    date: '',
    startTime: '09:30',
    endTime: '10:30',
    employeeId: '',
  });
  
  // Content management
  const [aboutContent, setAboutContent] = useState({ title: '', content: '' });
  const [contactContent, setContactContent] = useState({ 
    address: '', 
    phone: '', 
    email: '', 
    hours: '',
    socialMedia: { facebook: '', instagram: '', yelp: '' }
  });
  
  // Forms
  const [serviceForm, setServiceForm] = useState({ name: '', description: '', price: '', category: '', duration: '45' });
  const [newCategory, setNewCategory] = useState('');
  const [employeeForm, setEmployeeForm] = useState({ name: '', role: '' as 'Water' | 'Powder' | 'Everything' | '', phone: '' });
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  /** When true, services/employees/bookings/about/contact sync to S3 via PUT /api/cms/site */
  const [useCms, setUseCms] = useState(false);
  /** Weekly booking navigator (Bookings tab): anchor day for strip + selection highlight. */
  const [bookingsNavDate, setBookingsNavDate] = useState(() => startOfLocalDay(new Date()));
  const [siteSyncStatus, setSiteSyncStatus] = useState('');
  const [schedulingConfigSource, setSchedulingConfigSource] = useState<
    'postgres' | 'cms' | 'local'
  >('cms');
  const [contentConfigSource, setContentConfigSource] = useState<'postgres' | 'cms' | 'local'>(
    'cms'
  );

  // Authentication is handled by admin layout

  const persistSiteSnapshot = async (partial: {
    services?: Service[];
    employees?: Employee[];
    bookings?: Booking[];
    about?: typeof aboutContent;
    contact?: typeof contactContent;
    gallery?: CmsGalleryImage[];
    bookingBlocks?: CmsBookingBlock[];
  }) => {
    const nextServices = partial.services ?? services;
    const nextEmployees = partial.employees ?? employees;
    const nextBookings = partial.bookings ?? bookings;
    const nextAbout = partial.about ?? aboutContent;
    const nextContact = partial.contact ?? contactContent;
    const nextGallery = partial.gallery ?? galleryImages;
    const nextBookingBlocks = partial.bookingBlocks ?? bookingBlocks;
    const schedulingFromPg = schedulingConfigSource === 'postgres';
    const contentFromPg = contentConfigSource === 'postgres';
    const schedulingTouched =
      partial.services !== undefined ||
      partial.employees !== undefined ||
      partial.bookingBlocks !== undefined;
    const aboutContactTouched =
      partial.about !== undefined || partial.contact !== undefined;
    const galleryTouched = partial.gallery !== undefined;

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
      if (partial.bookingBlocks !== undefined) {
        localStorage.setItem('admin-booking-blocks', JSON.stringify(nextBookingBlocks));
        window.dispatchEvent(new Event(SITE_DATA_UPDATED_EVENT));
      }
      if (partial.contact !== undefined) {
        window.dispatchEvent(new Event(SITE_DATA_UPDATED_EVENT));
      }
      return;
    }

    if (schedulingFromPg && partial.bookings !== undefined) {
      return true;
    }

    if (schedulingFromPg && schedulingTouched) {
      const pgRes = await fetch('/api/admin/site-config', {
        method: 'PUT',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          services: nextServices,
          employees: nextEmployees,
          bookingBlocks: nextBookingBlocks,
        }),
      });
      if (!pgRes.ok) {
        const msg = await pgRes.text().catch(() => '');
        alert(`Could not save scheduling data (${pgRes.status}). ${msg || 'Check DATABASE_URL.'}`);
        return false;
      }
      if (partial.bookingBlocks !== undefined) {
        window.dispatchEvent(new Event(SITE_DATA_UPDATED_EVENT));
      }
      if (!aboutContactTouched && !galleryTouched && !(schedulingTouched && !schedulingFromPg)) {
        return true;
      }
    }

    if (contentFromPg && aboutContactTouched) {
      const contentRes = await fetch('/api/admin/site-content', {
        method: 'PUT',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          about: nextAbout,
          contact: nextContact,
        }),
      });
      if (!contentRes.ok) {
        const msg = await contentRes.text().catch(() => '');
        alert(`Could not save about/contact (${contentRes.status}). ${msg || 'Check DATABASE_URL.'}`);
        return false;
      }
      if (partial.contact !== undefined) {
        try {
          localStorage.setItem('admin-contact', JSON.stringify(nextContact));
        } catch {
          /* ignore */
        }
        window.dispatchEvent(new Event(SITE_DATA_UPDATED_EVENT));
      }
      if (!galleryTouched && !(schedulingTouched && !schedulingFromPg)) {
        return true;
      }
    }

    const needsS3 =
      galleryTouched ||
      (aboutContactTouched && !contentFromPg) ||
      (schedulingTouched && !schedulingFromPg) ||
      (!schedulingFromPg && partial.bookings !== undefined);

    if (!needsS3) {
      return true;
    }

    let s3Services = nextServices;
    let s3Employees = nextEmployees;
    let s3Bookings = nextBookings;
    let s3Blocks = nextBookingBlocks;
    let s3About = nextAbout;
    let s3Contact = nextContact;

    try {
      const cr = await fetch('/api/cms/site', { credentials: 'same-origin' });
      const d = await cr.json();
      const s = d.site;
      if (!s || typeof s !== 'object') {
        alert('Could not load site data before saving. Try again in a moment.');
        return false;
      }
      if (schedulingFromPg) {
        s3Services = Array.isArray(s.services) ? (s.services as Service[]) : nextServices;
        s3Employees = Array.isArray(s.employees) ? (s.employees as Employee[]) : nextEmployees;
        s3Bookings = Array.isArray(s.bookings) ? (s.bookings as Booking[]) : [];
        s3Blocks = coerceBookingBlocksList((s as { bookingBlocks?: unknown[] }).bookingBlocks);
      }
      if (contentFromPg) {
        if (s.about && typeof s.about === 'object') {
          s3About = s.about as typeof aboutContent;
        }
        if (s.contact && typeof s.contact === 'object') {
          s3Contact = s.contact as typeof contactContent;
        }
      }
    } catch {
      alert('Could not load the latest site snapshot before saving. Try again in a moment.');
      return false;
    }

    const res = await fetch('/api/cms/site', {
      method: 'PUT',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        version: 1,
        services: s3Services,
        employees: s3Employees,
        bookings: s3Bookings,
        smsJobs: [],
        bookingBlocks: s3Blocks,
        about: s3About,
        contact: s3Contact,
        gallery: nextGallery,
      }),
    });
    if (!res.ok) {
      const msg = await res.text().catch(() => '');
      alert(`Could not save to cloud (${res.status}). ${msg || 'Check S3 env vars on the server.'}`);
      return false;
    }
    if (partial.bookingBlocks !== undefined && !schedulingFromPg) {
      window.dispatchEvent(new Event(SITE_DATA_UPDATED_EVENT));
    }
    if (partial.contact !== undefined) {
      try {
        localStorage.setItem('admin-contact', JSON.stringify(nextContact));
      } catch {
        /* ignore */
      }
      window.dispatchEvent(new Event(SITE_DATA_UPDATED_EVENT));
    }
    return true;
  };

  const syncSiteToCloud = async () => {
    if (!useCms) {
      alert('Cloud storage is not configured on this server.');
      return;
    }
    setSiteSyncStatus('Syncing…');
    const ok = await persistSiteSnapshot({
      services,
      employees,
      bookings,
      about: aboutContent,
      contact: contactContent,
      gallery: galleryImages,
      bookingBlocks,
    });
    setSiteSyncStatus(ok ? 'Synced — old SMS reminders cleaned up.' : '');
  };

  // Load: S3 CMS when configured, else localStorage (gallery stays local until step 5)
  useEffect(() => {
    migrateLegacyStoredContactAddress();
    let cancelled = false;

    (async () => {
      try {
        let loadedSchedulingFromPg = false;
        let loadedBookingsFromPg = false;
        let loadedContentFromPg = false;

        const [configRes, contentRes, bookingsRes, cmsRes] = await Promise.all([
          fetch('/api/admin/site-config', { credentials: 'same-origin', cache: 'no-store' }),
          fetch('/api/admin/site-content', { credentials: 'same-origin', cache: 'no-store' }),
          fetch('/api/admin/bookings', { credentials: 'same-origin', cache: 'no-store' }),
          fetch('/api/cms/site', { credentials: 'same-origin', cache: 'no-store' }),
        ]);

        if (!cancelled && configRes.ok) {
          const configData = await configRes.json();
          if (configData.source === 'postgres') {
            setSchedulingConfigSource('postgres');
            loadedSchedulingFromPg = true;
            if (Array.isArray(configData.services)) {
              setServices(configData.services as Service[]);
            }
            if (Array.isArray(configData.employees)) {
              setEmployees(configData.employees as Employee[]);
            }
            if (Array.isArray(configData.bookingBlocks)) {
              setBookingBlocks(coerceBookingBlocksList(configData.bookingBlocks));
            }
          }
        }

        if (!cancelled && contentRes.ok) {
          const contentData = await contentRes.json();
          if (contentData.source === 'postgres') {
            setContentConfigSource('postgres');
            loadedContentFromPg = true;
            if (contentData.about && typeof contentData.about === 'object') {
              setAboutContent((prev) => ({ ...prev, ...contentData.about }));
            }
            if (contentData.contact && typeof contentData.contact === 'object') {
              const c = contentData.contact as typeof contactContent;
              setContactContent((prev) => ({
                ...prev,
                ...c,
                socialMedia: normalizeContactSocialMedia({
                  ...prev.socialMedia,
                  ...(c.socialMedia || {}),
                }),
              }));
            }
          }
        }

        if (!cancelled && bookingsRes.ok) {
          const bookingsData = await bookingsRes.json();
          if (bookingsData.source === 'postgres' && Array.isArray(bookingsData.bookings)) {
            setBookings(bookingsData.bookings as Booking[]);
            loadedBookingsFromPg = true;
          }
        }

        const data = await cmsRes.json();
        if (cancelled) return;

        if (data.configured === true && data.site && !data.error) {
          const s = data.site;
          setUseCms(true);
          if (!loadedSchedulingFromPg) {
            setSchedulingConfigSource('cms');
            if (Array.isArray(s.services)) setServices(s.services as Service[]);
            if (Array.isArray(s.employees)) setEmployees(s.employees as Employee[]);
            const blkUnknown = (s as { bookingBlocks?: unknown[] }).bookingBlocks;
            setBookingBlocks(coerceBookingBlocksList(blkUnknown));
          }
          if (!loadedBookingsFromPg && Array.isArray(s.bookings)) {
            setBookings(s.bookings as Booking[]);
          }
          if (!loadedContentFromPg) {
            setContentConfigSource('cms');
            if (s.about && typeof s.about === 'object') {
              setAboutContent((prev) => ({ ...prev, ...s.about }));
            }
            if (s.contact && typeof s.contact === 'object') {
              const c = s.contact as typeof contactContent;
              setContactContent((prev) => ({
                ...prev,
                ...c,
                socialMedia: normalizeContactSocialMedia({
                  ...prev.socialMedia,
                  ...(c.socialMedia || {}),
                }),
              }));
            }
          }
          if (Array.isArray(s.gallery) && s.gallery.length > 0) {
            setGalleryImages(normalizeCmsGalleryList(s.gallery));
          }
        } else {
          setSchedulingConfigSource('local');
          setContentConfigSource('local');
          const savedServices = localStorage.getItem('admin-services');
          const savedBookings = localStorage.getItem('admin-bookings');
          const savedEmployees = localStorage.getItem('admin-employees');
          const savedAbout = localStorage.getItem('admin-about');
          const savedContact = localStorage.getItem('admin-contact');
          if (savedServices) setServices(JSON.parse(savedServices));
          if (savedBookings) setBookings(JSON.parse(savedBookings));
          if (savedEmployees) setEmployees(JSON.parse(savedEmployees));
          if (savedAbout) setAboutContent(JSON.parse(savedAbout));
          if (savedContact) {
            const parsed = JSON.parse(savedContact) as typeof contactContent;
            setContactContent({
              ...parsed,
              socialMedia: normalizeContactSocialMedia(parsed.socialMedia),
            });
          }
          const savedBlocksElse = localStorage.getItem('admin-booking-blocks');
          if (savedBlocksElse) {
            try {
              const bl = JSON.parse(savedBlocksElse) as unknown[];
              setBookingBlocks(coerceBookingBlocksList(Array.isArray(bl) ? bl : []));
            } catch {
              /* ignore */
            }
          }
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
          if (savedContact) {
            const parsed = JSON.parse(savedContact) as typeof contactContent;
            setContactContent({
              ...parsed,
              socialMedia: normalizeContactSocialMedia(parsed.socialMedia),
            });
          }
          const savedBlocksCatch = localStorage.getItem('admin-booking-blocks');
          if (savedBlocksCatch) {
            try {
              const bl = JSON.parse(savedBlocksCatch) as unknown[];
              setBookingBlocks(coerceBookingBlocksList(Array.isArray(bl) ? bl : []));
            } catch {
              /* ignore */
            }
          }
        }
      }

      if (cancelled) return;
      const savedGallery = localStorage.getItem('admin-gallery');
      if (savedGallery) {
        try {
          const g = normalizeCmsGalleryList(JSON.parse(savedGallery));
          if (g.length > 0) {
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
        const urls = normalizeCmsGalleryList(local);
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
            smsJobs: [],
            bookingBlocks: Array.isArray(s.bookingBlocks) ? s.bookingBlocks : [],
            about: s.about && typeof s.about === 'object' ? s.about : { title: '', content: '' },
            contact:
              s.contact && typeof s.contact === 'object'
                ? s.contact
                : {
                    address: '',
                    phone: '',
                    email: '',
                    hours: '',
                    socialMedia: { facebook: '', instagram: '', yelp: '' },
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

  const persistBookingBlocks = (next: CmsBookingBlock[]) => {
    setBookingBlocks(next);
    void persistSiteSnapshot({ bookingBlocks: next });
  };

  const addBookingBlock = () => {
    if (!bookingBlockDraft.date.trim()) {
      alert('Pick a date for the blocked window.');
      return;
    }
    const id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}`;
    const empChosen = bookingBlockDraft.employeeId.trim();
    const raw = {
      id,
      date: bookingBlockDraft.date.trim(),
      startTime: bookingBlockDraft.startTime,
      endTime: bookingBlockDraft.endTime,
      salonWide: !empChosen,
      scope: empChosen ? ('stylist' as const) : ('salon' as const),
      employeeId: empChosen || undefined,
    };
    const normalized = normalizeCmsBookingBlock(raw);
    if (!normalized) {
      alert('Times must be 24-hour HH:MM with end strictly after start.');
      return;
    }
    persistBookingBlocks([...bookingBlocks, normalized]);
  };

  const removeBookingBlock = (id: string) => {
    if (!confirm('Remove this blocked window?')) return;
    persistBookingBlocks(bookingBlocks.filter((b) => b.id !== id));
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
        const entry: CmsGalleryImage =
          data.full && data.thumb
            ? { full: data.full, thumb: data.thumb }
            : { full: data.url || data.full, thumb: data.thumb || data.url || data.full };
        const newImages = [...galleryImages, entry];
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

  const legacyThumbCount = galleryImages.filter((item) => !galleryHasDedicatedThumb(item)).length;

  const runGalleryThumbMigration = async () => {
    if (!useCms) {
      alert('Cloud CMS (S3) must be enabled to generate thumbnails for existing photos.');
      return;
    }
    if (!confirm(`Generate WebP thumbnails for ${legacyThumbCount} photo(s)? This may take a few minutes.`)) {
      return;
    }
    setThumbMigrating(true);
    setThumbMigrateStatus('Starting…');
    try {
      let remaining = legacyThumbCount;
      while (remaining > 0) {
        const res = await fetch('/api/admin/migrate-gallery-thumbs?batch=5', {
          method: 'POST',
          credentials: 'same-origin',
        });
        const data = await res.json();
        if (!res.ok) {
          alert(data.error || 'Migration failed');
          break;
        }
        if (Array.isArray(data.gallery)) {
          setGalleryImages(normalizeCmsGalleryList(data.gallery));
        }
        remaining = typeof data.remaining === 'number' ? data.remaining : 0;
        const errNote =
          Array.isArray(data.errors) && data.errors.length > 0
            ? ` (${data.errors.length} error(s) this batch)`
            : '';
        setThumbMigrateStatus(`${remaining} remaining${errNote}`);
        if (!data.processed) break;
      }
      setThumbMigrateStatus(remaining === 0 ? 'All thumbnails ready.' : 'Stopped — check errors in server logs.');
    } catch {
      alert('Migration request failed');
    } finally {
      setThumbMigrating(false);
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

  const bookingsCalendarBase = `${adminDashboardBaseFromPathname(pathname)}/bookings`;
  const bookingsWeekMonday = mondayOfWeek(bookingsNavDate);
  const bookingsWeekSaturday = addDays(bookingsWeekMonday, 5);
  const bookingsWeekRangeLabel = formatWeekRangeLabel(bookingsWeekMonday, bookingsWeekSaturday);
  const bookingsSelectedIso = toISODateString(bookingsNavDate);

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
                  <p className="text-gray-500 text-sm mt-2">
                    Uploads save a full image plus a WebP thumbnail for faster gallery loading.
                  </p>
                </div>

                {useCms && legacyThumbCount > 0 && (
                  <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                    <p className="font-medium">
                      {legacyThumbCount} photo(s) need WebP thumbnails (one-time).
                    </p>
                    <p className="mt-1 text-amber-900/90">
                      Run this once — you do not need to re-upload your gallery.
                    </p>
                    <button
                      type="button"
                      disabled={thumbMigrating}
                      onClick={() => void runGalleryThumbMigration()}
                      className="mt-3 rounded-md bg-amber-800 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-900 disabled:opacity-60"
                    >
                      {thumbMigrating ? 'Generating thumbnails…' : 'Generate thumbnails for existing photos'}
                    </button>
                    {thumbMigrateStatus ? (
                      <p className="mt-2 text-xs text-amber-900/80">{thumbMigrateStatus}</p>
                    ) : null}
                  </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {galleryImages.map((item, index) => (
                    <div key={`${item.full}-${index}`} className="relative group">
                      <img
                        src={galleryThumbSrc(item)}
                        alt={`Nail salon gallery image ${index + 1} - ${SITE_BRAND_NAME} professional nail art work`}
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
                        placeholder="(602) 996-3699"
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
                        <label className="block text-xs text-gray-600 mb-1">Yelp</label>
                        <input
                          type="text"
                          value={contactContent.socialMedia.yelp}
                          onChange={(e) => setContactContent({ 
                            ...contactContent, 
                            socialMedia: { ...contactContent.socialMedia, yelp: e.target.value }
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-champagne-500 focus:border-champagne-500"
                          placeholder="Yelp profile URL"
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
                <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                  <div>
                    <h2 className="text-2xl font-semibold text-gray-800 mb-1">Bookings</h2>
                    <p className="text-gray-600 text-sm">
                      Closed Sundays. Choose a day for the full schedule, or open the dedicated bookings page.
                    </p>
                  </div>
                  {useCms && (
                    <div className="flex flex-col items-end gap-1">
                      <button
                        type="button"
                        onClick={() => void syncSiteToCloud()}
                        className="px-4 py-2 bg-champagne-500 text-white rounded-md hover:bg-champagne-600 transition text-sm font-semibold"
                      >
                        Sync to cloud
                      </button>
                      {siteSyncStatus ? (
                        <p className="text-xs text-gray-600">{siteSyncStatus}</p>
                      ) : null}
                    </div>
                  )}
                </div>
                <div className="rounded-xl border border-gray-200 bg-gradient-to-b from-gray-50/80 to-white p-6 space-y-6">
                  <WeeklyHeader
                    weekRangeLabel={bookingsWeekRangeLabel}
                    onPrevWeek={() => setBookingsNavDate((d) => addDays(d, -7))}
                    onNextWeek={() => setBookingsNavDate((d) => addDays(d, 7))}
                    onToday={() => setBookingsNavDate(startOfLocalDay(new Date()))}
                  />
                  <WeekGrid
                    anchorDate={bookingsNavDate}
                    selectedIso={bookingsSelectedIso}
                    bookingsBasePath={bookingsCalendarBase}
                    disablePastDates={false}
                  />
                </div>
                <div className="mt-10 border-t border-gray-200 pt-8">
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Block times on booking page</h3>
                  <p className="text-gray-600 text-sm mb-4">
                    <strong>Whole salon</strong> blocks online booking with <em>every</em> technician plus &quot;Anyone&quot;
                    mode. <strong>One technician</strong> only removes their slots — others stay bookable then. Hours use
                    24‑hour time; the end time is exclusive (what you pick is the first minute that opens again — e.g.
                    9:00–9:30 blocks 9:00 and does not remove a 10:00 start).
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end rounded-lg border border-gray-200 bg-white p-4">
                    <div className="md:col-span-3">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
                      <input
                        type="date"
                        value={bookingBlockDraft.date}
                        onChange={(e) => setBookingBlockDraft({ ...bookingBlockDraft, date: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Start</label>
                      <input
                        type="time"
                        step={300}
                        value={bookingBlockDraft.startTime}
                        onChange={(e) =>
                          setBookingBlockDraft({ ...bookingBlockDraft, startTime: e.target.value.slice(0, 5) })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1">End</label>
                      <input
                        type="time"
                        step={300}
                        value={bookingBlockDraft.endTime}
                        onChange={(e) =>
                          setBookingBlockDraft({ ...bookingBlockDraft, endTime: e.target.value.slice(0, 5) })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      />
                    </div>
                    <div className="md:col-span-3">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Scope</label>
                      <select
                        value={bookingBlockDraft.employeeId}
                        onChange={(e) => setBookingBlockDraft({ ...bookingBlockDraft, employeeId: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      >
                        <option value="">Whole salon · all technicians</option>
                        {employees.map((em) => (
                          <option key={em.id} value={em.id}>
                            {em.name} only
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <button
                        type="button"
                        onClick={addBookingBlock}
                        className="w-full px-4 py-2 bg-champagne-600 text-white rounded-md hover:bg-champagne-700 text-sm font-semibold"
                      >
                        Add block
                      </button>
                    </div>
                  </div>
                  {bookingBlocks.length > 0 ? (
                    <ul className="mt-4 space-y-2">
                      {[...bookingBlocks]
                        .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))
                        .map((b) => {
                          const emp =
                            !b.salonWide && b.employeeId ? employees.find((e) => e.id === b.employeeId) : undefined;
                          const who = b.salonWide
                            ? 'Whole salon · all technicians'
                            : emp
                              ? `${emp.name} only`
                              : b.employeeId
                                ? 'Staff (removed from list)'
                                : 'Technician-specific';
                          return (
                            <li
                              key={b.id}
                              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm"
                            >
                              <span className="text-gray-800">
                                <span className="font-semibold">{b.date}</span>{' '}
                                <span className="text-gray-600">
                                  {b.startTime}–{b.endTime}
                                </span>
                                <span className="text-gray-500"> · {who}</span>
                              </span>
                              <button
                                type="button"
                                onClick={() => removeBookingBlock(b.id)}
                                className="text-red-600 hover:text-red-800 text-xs font-semibold"
                              >
                                Remove
                              </button>
                            </li>
                          );
                        })}
                    </ul>
                  ) : (
                    <p className="mt-3 text-sm text-gray-500">No custom blocks — only existing appointments reduce availability.</p>
                  )}
                </div>

                <p className="mt-5 text-center text-sm text-gray-600">
                  <a
                    href={bookingsCalendarBase}
                    className="font-semibold text-champagne-700 hover:text-champagne-900 underline-offset-2 hover:underline"
                  >
                    Open full bookings page
                  </a>{' '}
                  for appointment details grouped by time.
                </p>
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
                        placeholder="(602) 996-3699"
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
