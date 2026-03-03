/**
 * Marketing Utilities for O'PIED DU MONT
 * Gestion des campagnes de fidélisation WhatsApp
 * Emplacement : /lib/marketing.ts
 * Version : 1.3 - Optimisation numéros CI & UX
 */

import { Linking, Alert } from 'react-native';
// @ts-ignore
import { supabase } from '../supabase';

/**
 * Récupère les clients inactifs (15 jours+) et lance la campagne de relance
 */
export async function runReactivationCampaign() {
  try {
    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

    // 1. Chercher les clients inactifs
    // Note : Assurez-vous que la table 'clients' existe avec ces colonnes
    const { data: inactiveClients, error } = await supabase
      .from('clients')
      .select('*')
      .lt('derniere_visite', fifteenDaysAgo.toISOString())
      .eq('actif', true);

    if (error) throw error;

    if (!inactiveClients || inactiveClients.length === 0) {
      Alert.alert(
        "Campagne Marketing", 
        "Aucun client inactif trouvé. Votre communauté est très fidèle ! ✨"
      );
      return;
    }

    // 2. Proposer de lancer les messages
    Alert.alert(
      "Relance Client 📢",
      `${inactiveClients.length} clients ne sont pas venus depuis 15 jours. Voulez-vous préparer les messages WhatsApp personnalisés ?`,
      [
        { text: "Annuler", style: "cancel" },
        { 
          text: "Lancer la campagne", 
          onPress: () => sendNextMarketingMessage(inactiveClients, 0) 
        }
      ]
    );

  } catch (error: any) {
    console.error("Erreur campagne:", error.message);
    Alert.alert("Erreur", "Impossible de récupérer la liste des clients. Vérifiez la table 'clients' dans Supabase.");
  }
}

/**
 * Envoie les messages un par un via WhatsApp
 */
async function sendNextMarketingMessage(clients: any[], index: number) {
  // Fin de la liste
  if (index >= clients.length) {
    Alert.alert("Terminé ! ✨", "Tous les messages de relance ont été traités.");
    return;
  }

  const client = clients[index];
  
  // Message personnalisé "O'PIED DU MONT"
  const message = `Bonjour ${client.nom} ! 👋\n\nVous nous manquez chez *O'PIED DU MONT* ! 🍽️\n\nÇa fait un moment que nous ne vous avons pas vu. Pour votre prochaine visite, montrez ce message et profitez d'un *Bissap offert* ! 🥤\n\nÀ très vite !`;

  // --- LOGIQUE DE FORMATAGE DU NUMÉRO (Optimisé Côte d'Ivoire) ---
  let phone = client.telephone.replace(/\s/g, '').replace(/-/g, '');
  
  // Si le numéro est à 10 chiffres (nouveau format CI) mais sans indicatif
  if (phone.length === 10 && !phone.startsWith('+')) {
    phone = `+225${phone}`;
  } 
  // Si c'est l'ancien format (8 chiffres), on ne peut pas deviner le préfixe 01, 05 ou 07 facilement
  // mais on ajoute au moins l'indicatif pays
  else if (!phone.startsWith('+')) {
    phone = phone.startsWith('225') ? `+${phone}` : `+225${phone}`;
  }

  const whatsappUrl = `whatsapp://send?phone=${phone}&text=${encodeURIComponent(message)}`;

  Alert.alert(
    `Client ${index + 1} / ${clients.length}`,
    `Envoyer l'offre à ${client.nom} (${phone}) ?`,
    [
      { 
        text: "Passer ce client", 
        onPress: () => sendNextMarketingMessage(clients, index + 1),
        style: "destructive"
      },
      { 
        text: "Ouvrir WhatsApp", 
        onPress: async () => {
          try {
            // Vérification si l'URL peut être ouverte (WhatsApp installé)
            const canOpen = await Linking.canOpenURL(whatsappUrl);
            if (canOpen) {
              await Linking.openURL(whatsappUrl);
              
              // On attend 1.5s avant de demander le suivant pour laisser le temps de switcher
              setTimeout(() => {
                sendNextMarketingMessage(clients, index + 1);
              }, 1500);
            } else {
              Alert.alert("Erreur", "WhatsApp n'est pas installé sur ce téléphone.");
            }
          } catch (err) {
            Alert.alert("Erreur", "Problème lors de l'ouverture de WhatsApp.");
          }
        } 
      }
    ],
    { cancelable: false }
  );
}