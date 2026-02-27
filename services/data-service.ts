/**
 * Data Service - O'PIED DU MONT
 * Gère la synchronisation, les recettes complexes et l'envoi en cuisine
 * Version corrigée avec respect strict des types (createdAt, updatedAt)
 */

import { supabase } from '../supabase';
import { AppAction } from '../app-context';
import { CartItem } from '../types';

/**
 * Rafraîchit les données (Categories et Menu)
 */
export const refreshAppData = async (dispatch: React.Dispatch<AppAction>) => {
  dispatch({ type: 'SET_LOADING', payload: true });

  try {
    // 1. Charger les catégories
    const { data: categoriesData, error: catError } = await supabase
      .from('categories')
      .select('*');

    if (catError) throw catError;

    // 2. Charger les articles du menu
    const { data: menuData, error: menuError } = await supabase
      .from('menu') 
      .select('*')
      .eq('actif', true); 

    if (menuError) throw menuError;

    // 3. Transformation avec respect strict des interfaces Category et MenuItem
    const now = new Date().toISOString();

    const formattedCategories = categoriesData.map(cat => ({
      id: cat.id.toString(),
      name: cat.nom,
      color: cat.couleur || '#EAB308',
      icon: cat.icone || '🍴',
      createdAt: cat.created_at || now, // Ajout pour corriger l'erreur TS
      updatedAt: cat.created_at || now  // Ajout pour corriger l'erreur TS
    }));

    const formattedMenuItems = menuData.map(item => {
      const categoryObj = categoriesData.find(c => c.id === item.categorie_id);
      return {
        id: item.id.toString(),
        name: item.nom,
        description: item.description || '',
        price: Number(item.prix),
        category: categoryObj ? categoryObj.nom : 'Autre',
        available: item.actif,
        image: item.image || '',
        createdAt: item.created_at || now, // Ajout pour corriger l'erreur TS
        updatedAt: item.created_at || now  // Ajout pour corriger l'erreur TS
      };
    });

    // 4. Envoi au State Global
    dispatch({
      type: 'SET_DATA',
      payload: {
        categories: formattedCategories,
        menuItems: formattedMenuItems,
      }
    });

  } catch (error: any) {
    console.error('Erreur Sync:', error.message);
    dispatch({ type: 'SET_ERROR', payload: error.message });
  } finally {
    dispatch({ type: 'SET_LOADING', payload: false });
  }
};

/**
 * LOGIQUE COMPLEXE : Déduit les stocks via la table 'menu_recettes'
 */
export const deductStockFromOrder = async (items: CartItem[]) => {
  try {
    for (const item of items) {
      // 1. Chercher la recette
      const { data: recette, error: recipeError } = await supabase
        .from('menu_recettes')
        .select('stock_id, quantite_consommee')
        .eq('menu_id', parseInt(item.menuItemId));

      if (!recipeError && recette && recette.length > 0) {
        // Cas A : Déduction par ingrédients (Recette complexe)
        for (const ingredient of recette) {
          const { data: stockNow } = await supabase
            .from('stock')
            .select('quantite')
            .eq('id', ingredient.stock_id)
            .single();

          if (stockNow) {
            const perteTotale = Number(ingredient.quantite_consommee) * item.quantity;
            await supabase
              .from('stock')
              .update({ quantite: Number(stockNow.quantite) - perteTotale })
              .eq('id', ingredient.stock_id);
          }
        }
      } else {
        // Cas B : Déduction directe (Boissons, etc.)
        const { data: stockItem } = await supabase
          .from('stock')
          .select('id, quantite')
          .eq('nom', item.name)
          .single();

        if (stockItem) {
          await supabase
            .from('stock')
            .update({ quantite: Number(stockItem.quantite) - item.quantity })
            .eq('id', stockItem.id);
        }
      }
    }
    return { success: true };
  } catch (error: any) {
    console.error('Erreur Stock Complexe:', error.message);
    throw error;
  }
};

/**
 * ENVOI EN CUISINE (Remplacement total de la logique Web)
 */
export const sendToKitchen = async (transactionId: number, tableNum: number | null, items: CartItem[]) => {
  try {
    const { error } = await supabase
      .from('preparation_cuisine')
      .insert([{
        transaction_id: transactionId,
        table_numero: tableNum,
        items: items, // On envoie le JSON du panier
        statut: 'en_attente'
      }]);

    if (error) throw error;
  } catch (error: any) {
    console.error('Erreur Envoi Cuisine:', error.message);
  }
};