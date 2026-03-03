/**
 * Data Service - O'PIED DU MONT
 * Gère la synchronisation globale (Menu, Catégories, Stocks, Employés, Marketing)
 * Version 4.0 : Intégration du calcul des clients à relancer
 * Règle n°2 : Toujours fournir le code complet.
 */

import { supabase } from '../supabase';
import { AppAction } from '../app-context';
import { CartItem } from '../types';

/**
 * Rafraîchit TOUTES les données de l'application
 */
export const refreshAppData = async (dispatch: React.Dispatch<AppAction>) => {
  dispatch({ type: 'SET_LOADING', payload: true });

  try {
    const now = new Date();
    const isoNow = now.toISOString();

    // Calcul de la date limite pour le marketing (30 jours en arrière)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      { data: categoriesData, error: catError },
      { data: menuData, error: menuError },
      { data: stockData, error: stockError },
      { data: employeesData, error: empError },
      { data: marketingData, error: markError }
    ] = await Promise.all([
      supabase.from('categories').select('*'),
      supabase.from('menu').select('*').eq('actif', true),
      supabase.from('stock').select('*'),
      supabase.from('employes').select('*').eq('actif', true),
      // Récupère les clients dont la dernière commande est ancienne ou inexistante
      supabase.from('clients')
        .select('id, derniere_commande')
        .or(`derniere_commande.lt.${thirtyDaysAgo.toISOString()},derniere_commande.is.null`)
    ]);

    if (catError) throw catError;
    if (menuError) throw menuError;
    if (stockError) throw stockError;
    if (empError) throw empError;
    if (markError) throw markError;

    const formattedCategories = (categoriesData || []).map(cat => ({
      id: cat.id.toString(),
      name: cat.nom,
      color: cat.couleur || '#EAB308',
      icon: cat.icone || '🍴',
      createdAt: cat.created_at || isoNow,
      updatedAt: cat.created_at || isoNow
    }));

    const formattedMenuItems = (menuData || []).map(item => {
      const categoryObj = formattedCategories.find(c => c.id === item.categorie_id.toString());
      return {
        id: item.id.toString(),
        name: item.nom,
        description: item.description || '',
        price: Number(item.prix),
        category: categoryObj ? categoryObj.name : 'Autre',
        available: item.actif,
        image: item.image || '',
        createdAt: item.created_at || isoNow,
        updatedAt: item.created_at || isoNow
      };
    });

    const formattedStocks = (stockData || []).map(s => ({
      id: s.id.toString(),
      name: s.nom,
      quantity: Number(s.quantite),
      unit: s.unite || 'pcs',
      minQuantity: Number(s.seuil_alerte) || 5,
      maxQuantity: 100, 
      lastUpdated: s.derniere_mise_a_jour || isoNow,
      createdAt: isoNow,
      updatedAt: isoNow
    }));

    const formattedEmployees = (employeesData || []).map(emp => ({
      id: emp.id.toString(),
      nom: emp.nom,
      telephone: emp.telephone || '',
      role: emp.role || 'staff',
      est_actif: emp.actif,
      hireDate: emp.created_at || isoNow,
      created_at: emp.created_at || isoNow,
      updated_at: emp.created_at || isoNow
    }));

    // Dispatch global incluant le marketingCount
    dispatch({
      type: 'SET_DATA',
      payload: {
        categories: formattedCategories,
        menuItems: formattedMenuItems,
        stockItems: formattedStocks,
        employees: formattedEmployees,
        marketingCount: marketingData?.length || 0 // Mise à jour du badge HomeScreen
      }
    });

  } catch (error: any) {
    console.error('Erreur Synchronisation Globale:', error.message);
    dispatch({ type: 'SET_ERROR', payload: error.message });
  } finally {
    dispatch({ type: 'SET_LOADING', payload: false });
  }
};

/**
 * DÉDUCTION DES STOCKS (Version RPC Atomique)
 */
export const deductStockFromOrder = async (items: CartItem[]) => {
  try {
    for (const item of items) {
      const menuId = parseInt(item.menuItemId || item.id);

      const { data: recette } = await supabase
        .from('menu_recettes')
        .select('stock_id, quantite_consommee')
        .eq('menu_id', menuId);

      if (recette && recette.length > 0) {
        for (const ingredient of recette) {
          const quantiteARetirer = Number(ingredient.quantite_consommee) * item.quantity;
          await supabase.rpc('decrement_stock', { 
            row_id: ingredient.stock_id, 
            amount: quantiteARetirer 
          });
        }
      } else {
        const { data: stockItem } = await supabase
          .from('stock')
          .select('id')
          .eq('nom', item.name)
          .single();

        if (stockItem) {
          await supabase.rpc('decrement_stock', { 
            row_id: stockItem.id, 
            amount: item.quantity 
          });
        }
      }
    }
    return { success: true };
  } catch (error: any) {
    console.error('Erreur Déstockage Critique:', error.message);
    throw error;
  }
};

/**
 * ENVOI EN CUISINE
 */
export const sendToKitchen = async (transactionId: number, tableNum: number | null, items: CartItem[]) => {
  try {
    const itemsFormatted = items.map(i => ({
      nom: i.name,
      quantite: i.quantity
    }));

    const { error } = await supabase
      .from('preparation_cuisine')
      .insert([{
        transaction_id: transactionId,
        table_numero: tableNum,
        items: itemsFormatted, 
        statut: 'en_attente',
        created_at: new Date().toISOString()
      }]);

    if (error) throw error;
  } catch (error: any) {
    console.error('Erreur Cuisine:', error.message);
    throw error;
  }
};