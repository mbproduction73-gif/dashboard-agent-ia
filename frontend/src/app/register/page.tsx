'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useAuth } from '@/hooks/useAuth';

interface RegisterForm {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  businessName: string;
  businessType: string;
  phone?: string;
}

const BUSINESS_TYPES = [
  { value: 'coiffeur', label: 'Coiffeur / Barbershop' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'medecin', label: 'Médecin / Santé' },
  { value: 'esthetique', label: 'Esthétique / Spa' },
  { value: 'sport', label: 'Sport / Coach' },
  { value: 'autre', label: 'Autre' },
];

export default function RegisterPage() {
  const router = useRouter();
  const { register: registerUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterForm>();

  const onSubmit = async (data: RegisterForm) => {
    setIsLoading(true);
    try {
      await registerUser({
        fullName: data.fullName,
        email: data.email,
        password: data.password,
        businessName: data.businessName,
        businessType: data.businessType,
        phone: data.phone,
      });
      toast.success('Compte créé ! Bienvenue sur AgendaPro');
      router.push('/dashboard');
    } catch (error: unknown) {
      const msg =
        (error as { response?: { data?: { error?: string } } })?.response?.data?.error
        || 'Erreur lors de l\'inscription';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 shadow-lg">
            <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Créer mon compte</h1>
          <p className="mt-1 text-sm text-gray-500">14 jours gratuits, sans carte bancaire</p>
        </div>

        <div className="card animate-fade-in">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Infos personnelles */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Votre nom</label>
                <input
                  {...register('fullName', { required: 'Nom requis', minLength: { value: 2, message: 'Min 2 caractères' } })}
                  placeholder="Jean Dupont"
                  className="input"
                />
                {errors.fullName && <p className="mt-1 text-xs text-red-500">{errors.fullName.message}</p>}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Téléphone</label>
                <input
                  {...register('phone')}
                  type="tel"
                  placeholder="+33612345678"
                  className="input"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Email professionnel</label>
              <input
                {...register('email', {
                  required: 'Email requis',
                  pattern: { value: /^\S+@\S+$/i, message: 'Email invalide' },
                })}
                type="email"
                placeholder="contact@moncommerce.fr"
                className="input"
              />
              {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
            </div>

            {/* Infos commerce */}
            <div className="border-t border-gray-100 pt-4">
              <p className="mb-3 text-sm font-semibold text-gray-700">Votre commerce</p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Nom du commerce</label>
                  <input
                    {...register('businessName', { required: 'Nom du commerce requis' })}
                    placeholder="Salon Élégance"
                    className="input"
                  />
                  {errors.businessName && <p className="mt-1 text-xs text-red-500">{errors.businessName.message}</p>}
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Type de commerce</label>
                  <select
                    {...register('businessType', { required: 'Type requis' })}
                    className="input"
                  >
                    <option value="">Sélectionner...</option>
                    {BUSINESS_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                  {errors.businessType && <p className="mt-1 text-xs text-red-500">{errors.businessType.message}</p>}
                </div>
              </div>
            </div>

            {/* Mot de passe */}
            <div className="border-t border-gray-100 pt-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Mot de passe</label>
                  <input
                    {...register('password', { required: 'Requis', minLength: { value: 8, message: 'Min 8 caractères' } })}
                    type="password"
                    placeholder="••••••••"
                    className="input"
                  />
                  {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Confirmer</label>
                  <input
                    {...register('confirmPassword', {
                      required: 'Requis',
                      validate: (v) => v === watch('password') || 'Les mots de passe ne correspondent pas',
                    })}
                    type="password"
                    placeholder="••••••••"
                    className="input"
                  />
                  {errors.confirmPassword && <p className="mt-1 text-xs text-red-500">{errors.confirmPassword.message}</p>}
                </div>
              </div>
            </div>

            <button type="submit" disabled={isLoading} className="btn-primary mt-2 w-full py-2.5">
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Création en cours...
                </span>
              ) : 'Créer mon compte gratuit'}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-gray-500">
            Déjà un compte ?{' '}
            <Link href="/login" className="font-medium text-blue-600 hover:text-blue-700">
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
