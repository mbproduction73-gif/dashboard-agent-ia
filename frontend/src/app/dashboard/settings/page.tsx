'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { authApi, servicesApi } from '@/lib/api';
import { Service } from '@/types';

interface ProfileForm {
  fullName: string;
  businessName: string;
  phone: string;
  address: string;
  whatsappNumber: string;
}

interface ServiceForm {
  name: string;
  duration: number;
  price: number;
  color: string;
  description: string;
}

const COLOR_PRESETS = ['#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#EF4444', '#06B6D4'];

export default function SettingsPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [editService, setEditService] = useState<Service | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingService, setIsSavingService] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'services'>('profile');

  const profileForm = useForm<ProfileForm>();
  const serviceForm = useForm<ServiceForm>({ defaultValues: { duration: 30, color: '#3B82F6' } });

  useEffect(() => {
    authApi.getMe().then(({ data }) => {
      profileForm.reset({
        fullName: data.user.fullName,
        businessName: data.business?.name || '',
        phone: data.business?.phone || '',
        address: data.business?.address || '',
        whatsappNumber: data.business?.whatsapp_number || '',
      });
    });
    loadServices();
  }, []);

  const loadServices = async () => {
    const { data } = await servicesApi.getAll();
    setServices(data.services);
  };

  const saveProfile = async (data: ProfileForm) => {
    setIsSavingProfile(true);
    try {
      await authApi.updateProfile(data);
      toast.success('Profil mis à jour');
    } catch {
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const saveService = async (data: ServiceForm) => {
    setIsSavingService(true);
    try {
      if (editService) {
        await servicesApi.update(editService.id, data);
        toast.success('Service modifié');
      } else {
        await servicesApi.create(data);
        toast.success('Service créé');
      }
      await loadServices();
      setShowServiceForm(false);
      setEditService(null);
      serviceForm.reset({ duration: 30, color: '#3B82F6' });
    } catch {
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setIsSavingService(false);
    }
  };

  const deleteService = async (id: string) => {
    if (!confirm('Désactiver ce service ?')) return;
    try {
      await servicesApi.delete(id);
      toast.success('Service désactivé');
      loadServices();
    } catch {
      toast.error('Erreur');
    }
  };

  const openEditService = (svc: Service) => {
    setEditService(svc);
    serviceForm.reset({
      name: svc.name,
      duration: svc.duration,
      price: svc.price || 0,
      color: svc.color,
      description: svc.description || '',
    });
    setShowServiceForm(true);
  };

  return (
    <div className="animate-fade-in space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Paramètres</h1>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-gray-100 p-1 w-fit">
        {(['profile', 'services'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`rounded-lg px-5 py-2 text-sm font-medium transition-all ${
              activeTab === tab
                ? 'bg-white text-gray-900 shadow'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'profile' ? 'Profil & Commerce' : 'Services'}
          </button>
        ))}
      </div>

      {/* Tab : Profil */}
      {activeTab === 'profile' && (
        <div className="card max-w-2xl">
          <h2 className="mb-5 font-semibold text-gray-900">Informations du commerce</h2>
          <form onSubmit={profileForm.handleSubmit(saveProfile)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Votre nom</label>
                <input {...profileForm.register('fullName')} className="input" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Nom du commerce</label>
                <input {...profileForm.register('businessName')} className="input" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Téléphone</label>
                <input {...profileForm.register('phone')} type="tel" placeholder="+33612345678" className="input" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  <span className="flex items-center gap-1.5">
                    WhatsApp
                    <span className="rounded bg-green-100 px-1.5 py-0.5 text-xs text-green-700">Intégration IA</span>
                  </span>
                </label>
                <input {...profileForm.register('whatsappNumber')} type="tel" placeholder="+33612345678" className="input" />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Adresse</label>
              <input {...profileForm.register('address')} placeholder="12 rue de la Paix, Paris" className="input" />
            </div>

            <button type="submit" disabled={isSavingProfile} className="btn-primary">
              {isSavingProfile ? 'Sauvegarde...' : 'Sauvegarder'}
            </button>
          </form>
        </div>
      )}

      {/* Tab : Services */}
      {activeTab === 'services' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">{services.filter(s => s.is_active).length} service(s) actif(s)</p>
            <button
              onClick={() => { setEditService(null); serviceForm.reset({ duration: 30, color: '#3B82F6' }); setShowServiceForm(true); }}
              className="btn-primary text-sm"
            >
              + Ajouter un service
            </button>
          </div>

          {/* Formulaire service */}
          {showServiceForm && (
            <div className="card border-blue-100">
              <h3 className="mb-4 font-semibold text-gray-900">
                {editService ? 'Modifier le service' : 'Nouveau service'}
              </h3>
              <form onSubmit={serviceForm.handleSubmit(saveService)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">Nom *</label>
                    <input
                      {...serviceForm.register('name', { required: true })}
                      placeholder="Coupe Femme"
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">Durée (min) *</label>
                    <input
                      {...serviceForm.register('duration', { required: true })}
                      type="number"
                      min={5}
                      step={5}
                      className="input"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">Prix (€)</label>
                    <input
                      {...serviceForm.register('price')}
                      type="number"
                      min={0}
                      step={0.5}
                      placeholder="35.00"
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">Couleur calendrier</label>
                    <div className="flex items-center gap-2">
                      {COLOR_PRESETS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => serviceForm.setValue('color', c)}
                          className="h-7 w-7 rounded-full border-2 transition-transform hover:scale-110"
                          style={{
                            backgroundColor: c,
                            borderColor: serviceForm.watch('color') === c ? '#1d4ed8' : 'transparent',
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Description</label>
                  <input {...serviceForm.register('description')} placeholder="Description optionnelle" className="input" />
                </div>

                <div className="flex gap-3">
                  <button type="button" onClick={() => { setShowServiceForm(false); setEditService(null); }} className="btn-secondary flex-1">
                    Annuler
                  </button>
                  <button type="submit" disabled={isSavingService} className="btn-primary flex-1">
                    {isSavingService ? 'Sauvegarde...' : editService ? 'Modifier' : 'Créer'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Liste des services */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((svc) => (
              <div
                key={svc.id}
                className={`card relative overflow-hidden transition-opacity ${!svc.is_active ? 'opacity-50' : ''}`}
              >
                {/* Bande couleur */}
                <div className="absolute left-0 top-0 h-full w-1 rounded-l-xl" style={{ backgroundColor: svc.color }} />
                <div className="pl-3">
                  <div className="flex items-start justify-between">
                    <p className="font-semibold text-gray-900">{svc.name}</p>
                    <div className="flex gap-1">
                      <button onClick={() => openEditService(svc)} className="rounded p-1 text-gray-400 hover:text-blue-600">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button onClick={() => deleteService(svc.id)} className="rounded p-1 text-gray-400 hover:text-red-600">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-sm text-gray-500">
                    <span>{svc.duration} min</span>
                    {svc.price && <span className="font-medium text-gray-700">{svc.price}€</span>}
                  </div>
                  {svc.description && <p className="mt-1 text-xs text-gray-400">{svc.description}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
