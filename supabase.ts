/**
 * Supabase Configuration for O'PIED DU MONT Mobile
 * Nettoyé, corrigé et aligné sur le schéma SQL réel
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase URL or Anon Key not configured. ' +
    'Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY environment variables.'
  );
}

// Instance du client Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * --- TYPES POUR LES TABLES SUPABASE ---
 * Alignés sur tes scripts SQL (SERIAL = number)
 */

export interface SupabaseCategory {
  id: number;
  nom: string;
  couleur: string | null;
  icone: string | null;
}

export interface SupabaseMenuItem {
  id: number;
  nom: string;
  categorie_id: number;
  prix: number;
  description: string | null;
  actif: boolean;
  image: string | null;
}

export interface SupabaseStockItem {
  id: number;
  nom: string;
  categorie: string | null;
  quantite: number;
  seuil_alerte: number;
  unite: string | null;
  prix_unitaire: number | null;
  fournisseur: string | null;
  derniere_mise_a_jour?: string;
}

export interface SupabaseTable {
  id: number;
  numero: number;
  places: number;
  statut: 'libre' | 'occupee' | 'reservee';
}

export interface SupabaseEmployee {
  id: number;
  nom: string;
  role: string;
  code_pin: string; // Mis à jour selon ton script SQL
  actif: boolean;
}

export interface SupabaseTransaction {
  id: number;
  commande_id: number | null;
  commande_numero: number | null;
  table_numero: number | null;
  items: any; // Format JSONB (notre CartItem[])
  sous_total: number;
  reduction: number;
  montant_total: number;
  mode_paiement: string;
  montant_recu: number | null;
  monnaie: number | null;
  caissier: string;
  payee_a: string;
  creee_a: string;
}

/**
 * --- FONCTIONS UTILITAIRES POUR L'AUTHENTIFICATION ---
 */

export async function signUp(email: string, password: string, name: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
      },
    },
  });

  if (error) throw error;
  return data;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
}

export async function resetPassword(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) throw error;
}

/**
 * --- FONCTIONS MÉTIER (Aide pour la caisse) ---
 */

// Exemple : Vérifier un code PIN employé
export async function verifyEmployeePin(pin: string) {
  const { data, error } = await supabase
    .from('employes')
    .select('*')
    .eq('code_pin', pin)
    .eq('actif', true)
    .single();

  if (error) return null;
  return data;
}