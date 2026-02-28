/**
 * Data Service - O'PIED DU MONT
 * Gère la synchronisation globale (Menu, Catégories, Stocks, Employés)
 * Version Centralisée : Charge toutes les données vitales au démarrage
 */

import { supabase } from '../supabase';
import { AppAction } from '../app-context';
import { CartItem } from '../types';

/**
 * Rafraîchit TOUTES les données de l'application
 * Appelé au démarrage et lors d'un "Pull to Refresh"
 */
export const refreshAppData = async (dispatch: React.Dispatch<AppAction>) => {
  dispatch({ type: 'SET_LOADING', payload: true });

  try {
    const now = new Date().toISOString();

    // 1. Chargement parallèle pour plus de rapidité (Promise.all)
    const [
      { data: categoriesData, error: catError },
      { data: menuData, error: menuError },
      { data: stockData, error: stockError },
      { data: employeesData, error: empError }
    ] = await Promise.all([
      supabase.from('categories').select('*'),
      supabase.from('menu').select('*').eq('actif', true),
      supabase.from('stock').select('*'),
      supabase.from('employes').select('*').eq('actif', true)
    ]);

    // Vérification des erreurs
    if (catError) throw catError;
    if (menuError) throw menuError;
    if (stockError) throw stockError;
    if (empError) throw empError;

    // 2. Formatage des Catégories (aligné sur types.ts)
    const formattedCategories = (categoriesData || []).map(cat => ({
      id: cat.id.toString(),
      name: cat.nom,
      color: cat.couleur || '#EAB308',
      icon: cat.icone || '🍴',
      createdAt: cat.created_at || now,
      updatedAt: cat.created_at || now
    }));

    // 3. Formatage du Menu avec lien catégorie
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
        createdAt: item.created_at || now,
        updatedAt: item.created_at || now
      };
    });

    // 4. Formatage des Stocks
    const formattedStocks = (stockData || []).map(s => ({
      id: s.id.toString(),
      name: s.nom,
      quantity: Number(s.quantite),
      unit: s.unite || 'pcs',
      minQuantity: Number(s.seuil_alerte) || 5,
      maxQuantity: 100, 
      lastUpdated: s.derniere_mise_a_jour || now,
      createdAt: now,
      updatedAt: now
    }));

    // 5. Formatage des Employés
    const formattedEmployees = (employeesData || []).map(emp => ({
      id: emp.id.toString(),
      nom: emp.nom,
      telephone: emp.telephone || '',
      role: emp.role || 'staff',
      est_actif: emp.actif,
      hireDate: emp.created_at || now,
      created_at: emp.created_at || now,
      updated_at: emp.created_at || now
    }));

    // 6. Mise à jour massive du State Global
    dispatch({
      type: 'SET_DATA',
      payload: {
        categories: formattedCategories,
        menuItems: formattedMenuItems,
        stockItems: formattedStocks,
        employees: formattedEmployees
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
 * LOGIQUE COMPLEXE : Déduit les stocks via la table 'menu_recettes'
 */
export const deductStockFromOrder = async (items: CartItem[]) => {
  try {
    for (const item of items) {
      // On cherche si l'article possède une recette
      const { data: recette, error: recipeError } = await supabase
        .from('menu_recettes')
        .select('stock_id, quantite_consommee')
        .eq('menu_id', parseInt(item.menuItemId || item.id));

      if (!recipeError && recette && recette.length > 0) {
        // Cas A : Déduction par ingrédients
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
        // Cas B : Déduction directe (nom à nom)
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
    console.error('Erreur Déstockage Service:', error.message);
    throw error;
  }
};

/**
 * ENVOI EN CUISINE 
 * Note : On reformate ici pour que l'écran Cuisine reçoive 'nom' et 'quantite' (JSONB)
 */
export const sendToKitchen = async (transactionId: number, tableNum: number | null, items: CartItem[]) => {
  try {
    // Formatage pour éviter que l'écran Cuisine affiche du vide
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
        statut: 'en_attente'
      }]);

    if (error) throw error;
  } catch (error: any) {
    console.error('Erreur Envoi Cuisine Service:', error.message);
    throw error;
  }
};