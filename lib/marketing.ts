/**
 * Marketing Utilities for O'PIED DU MONT
 * Gestion des campagnes de fidélisation WhatsApp
 */

import { Linking, Alert } from 'react-native';
// @ts-ignore
import { supabase } from '../supabase';

/**
 * Récupère les clients inactifs et prépare les messages WhatsApp
 */
export async function runReactivationCampaign() {
  try {
    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

    // 1. Chercher les clients qui ne sont pas venus depuis 15 jours
    const { data: inactiveClients, error } = await supabase
      .from('clients')
      .select('*')
      .lt('derniere_visite', fifteenDaysAgo.toISOString());

    if (error) throw error;

    if (!inactiveClients || inactiveClients.length === 0) {
      Alert.alert("Campagne", "Aucun client inactif trouvé pour le moment. Tout le monde est fidèle ! ✨");
      return;
    }

    // 2. Proposer de lancer les messages
    Alert.alert(
      "Campagne Marketing",
      `${inactiveClients.length} clients ne sont pas venus depuis 15 jours. Voulez-vous préparer les messages de relance ?`,
      [
        { text: "Annuler", style: "cancel" },
        { 
          text: "Lancer", 
          onPress: () => sendNextMarketingMessage(inactiveClients, 0) 
        }
      ]
    );

  } catch (error: any) {
    console.error("Erreur campagne:", error.message);
    Alert.alert("Erreur", "Impossible de récupérer les clients inactifs.");
  }
}

/**
 * Envoie les messages un par un (WhatsApp ne permet pas l'envoi de masse automatisé sans API payante)
 */
async function sendNextMarketingMessage(clients: any[], index: number) {
  if (index >= clients.length) {
    Alert.alert("Succès", "Campagne terminée !");
    return;
  }

  const client = clients[index];
  const message = `Bonjour ${client.nom} ! 👋\n\nVous nous manquez chez *O'PIED DU MONT* ! 🍽️\n\nÇa fait un moment que nous ne vous avons pas vu. Pour votre prochaine visite, montrez ce message et profitez d'un *Bissap offert* ! 🥤\n\nÀ très vite !`;

  const whatsappUrl = `whatsapp://send?phone=225${client.telephone}&text=${encodeURIComponent(message)}`;

  Alert.alert(
    `Client ${index + 1}/${clients.length}`,
    `Envoyer à ${client.nom} (${client.telephone}) ?`,
    [
      { 
        text: "Passer", 
        onPress: () => sendNextMarketingMessage(clients, index + 1) 
      },
      { 
        text: "Envoyer", 
        onPress: () => {
          Linking.openURL(whatsappUrl);
          // On attend un peu avant de passer au suivant pour laisser l'utilisateur revenir dans l'app
          setTimeout(() => sendNextMarketingMessage(clients, index + 1), 2000);
        }
      }
    ]
  );
}