/**
 * Checkout Screen - O'PIED DU MONT Mobile
 * Emplacement : /app/checkout.tsx
 * Version : 1.5 - Correction Flux Admin & Multi-Paniers
 * Règle n°2 : Toujours fournir le code complet du fichier.
 */

import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, TextInput, TouchableOpacity, 
  ScrollView, Alert, Linking, ActivityIndicator 
} from 'react-native';
import { useRouter } from 'expo-router';

import { ScreenContainer } from '../components/screen-container';
import { useColors } from '../hooks/use-colors';
import { formatPrice } from '../formatting';
import { useApp } from '../app-context';
import { supabase } from '../supabase';

export default function CheckoutScreen() {
  const colors = useColors();
  const router = useRouter();
  const { state, dispatch, actions } = useApp();
  
  const [customerName, setCustomerName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // RÉCUPÉRATION DU PANIER ACTIF (Important pour le Multi-Paniers)
  const activeTab = state.activeTab ?? 0;
  const activeCart = state.carts[activeTab] || [];
  const user = state.user;

  // Calculs financiers
  const subtotal = activeCart.reduce((sum, item) => {
    const p = item.price || 0;
    const q = item.quantity || 0;
    return sum + (p * q);
  }, 0);

  const serviceCharge = subtotal * 0.05; 
  const total = subtotal + serviceCharge;

  const validateOrder = async () => {
    if (activeCart.length === 0) {
      Alert.alert("Panier vide", "Aucun article à encaisser.");
      return;
    }

    if (!customerName || !phoneNumber) {
      Alert.alert("Champs manquants", "Veuillez remplir le nom et le numéro WhatsApp du client.");
      return;
    }

    const cleanPhone = phoneNumber.replace(/\s/g, '');
    if (cleanPhone.length < 8) {
      Alert.alert("Numéro invalide", "Veuillez entrer un numéro valide (ex: 0701020304).");
      return;
    }

    setIsProcessing(true);

    try {
      // 1. Enregistrement / Mise à jour du client (Fidélité)
      const { data: customer, error: custError } = await supabase
        .from('clients')
        .upsert({ 
          nom: customerName, 
          telephone: cleanPhone,
          derniere_visite: new Date().toISOString(),
          actif: true
        }, { onConflict: 'telephone' })
        .select()
        .single();

      if (custError) throw custError;

      // 2. Préparation des lignes de vente
      const itemsForSql = activeCart.map(item => ({
        nom: item.name || 'Produit',
        quantite: item.quantity || 1,
        prix_unitaire: item.price || 0
      }));

      // 3. Création de la transaction financière
      const { data: transaction, error: transError } = await supabase
        .from('transactions')
        .insert({
          client_id: customer.id,
          client_contact: cleanPhone,
          montant_total: total,
          sous_total: subtotal,
          items: itemsForSql,
          mode_paiement: 'especes',
          caissier: user?.nom || 'Admin',
          session_id: state.currentSession?.id || null,
          creee_a: new Date().toISOString()
        })
        .select()
        .single();

      if (transError) throw transError;

      // 4. Construction du reçu numérique WhatsApp
      const itemsList = activeCart
        .map((item) => `• ${item.quantity}x ${item.name} : ${formatPrice((item.price || 0) * (item.quantity || 0))}`)
        .join('\n');

      const message = 
        `*🏔️ O'PIED DU MONT 🍴*\n` +
        `------------------------------------------\n` +
        `Merci pour votre confiance *${customerName}* !\n\n` +
        `*VOTRE REÇU :*\n` +
        `${itemsList}\n` +
        `------------------------------------------\n` +
        `Sous-total : ${formatPrice(subtotal)}\n` +
        `Service (5%) : ${formatPrice(serviceCharge)}\n` +
        `*TOTAL PAYÉ : ${formatPrice(total)}*\n\n` +
        `_Reçu généré par ${user?.nom || 'la direction'}. ✨_`;

      const whatsappUrl = `whatsapp://send?phone=225${cleanPhone}&text=${encodeURIComponent(message)}`;

      Alert.alert(
        "Vente Terminée ✅",
        `Le paiement de ${formatPrice(total)} a été enregistré.`,
        [
          { 
            text: "Fermer", 
            onPress: async () => {
              dispatch({ type: 'CLEAR_CART' });
              if (actions?.refresh) await actions.refresh();
              router.replace('/'); 
            }
          },
          { 
            text: "Envoyer Reçu WhatsApp", 
            style: "default",
            onPress: async () => {
              const supported = await Linking.canOpenURL(whatsappUrl);
              if (supported) { 
                await Linking.openURL(whatsappUrl); 
              } else {
                Alert.alert("Erreur", "WhatsApp n'est pas installé.");
              }
              dispatch({ type: 'CLEAR_CART' });
              if (actions?.refresh) await actions.refresh();
              router.replace('/');
            }
          }
        ]
      );

    } catch (error: any) {
      console.error("Erreur Checkout:", error);
      Alert.alert("Erreur de transaction", error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.foreground }]}>Encaissement</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            Panier #{activeTab + 1} • {user?.role === 'admin' ? 'Mode Direction' : 'Mode Caisse'}
          </Text>
        </View>
        
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.label, { color: colors.muted }]}>NOM DU CLIENT</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.background }]}
            placeholder="Ex: M. Kouassi"
            placeholderTextColor={colors.muted}
            value={customerName}
            onChangeText={setCustomerName}
          />

          <Text style={[styles.label, { color: colors.muted, marginTop: 20 }]}>WHATSAPP (CÔTE D'IVOIRE)</Text>
          <View style={[styles.phoneWrapper, { borderColor: colors.border, backgroundColor: colors.background }]}>
            <Text style={[styles.prefix, { color: colors.muted }]}>+225 </Text>
            <TextInput
              style={[styles.phoneInput, { color: colors.foreground }]}
              placeholder="0700000000"
              placeholderTextColor={colors.muted}
              keyboardType="phone-pad"
              maxLength={10}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
            />
          </View>
        </View>

        <View style={styles.summaryContainer}>
          <View style={styles.summaryLine}>
            <Text style={{ color: colors.muted, fontSize: 16 }}>Articles ({activeCart.length})</Text>
            <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: '600' }}>{formatPrice(subtotal)}</Text>
          </View>
          <View style={styles.summaryLine}>
            <Text style={{ color: colors.muted, fontSize: 16 }}>Frais de service (5%)</Text>
            <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: '600' }}>{formatPrice(serviceCharge)}</Text>
          </View>
          <View style={[styles.totalLine, { borderTopColor: colors.border }]}>
            <Text style={[styles.totalLabel, { color: colors.foreground }]}>TOTAL À ENCAISSER</Text>
            <Text style={[styles.totalAmount, { color: colors.primary }]}>{formatPrice(total)}</Text>
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.submitBtn, { backgroundColor: colors.primary, opacity: isProcessing ? 0.7 : 1 }]}
          onPress={validateOrder}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.submitBtnText}>CONFIRMER LE PAIEMENT</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={{ color: colors.muted, fontWeight: '700' }}>← Retour au panier</Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { padding: 25, paddingBottom: 60 },
  header: { marginBottom: 30 },
  title: { fontSize: 34, fontWeight: '900', letterSpacing: -1.5 },
  subtitle: { fontSize: 14, fontWeight: '600', marginTop: 5 },
  card: { padding: 25, borderRadius: 28, borderWidth: 1, marginBottom: 25, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10 },
  label: { fontSize: 10, fontWeight: '900', marginBottom: 10, letterSpacing: 1, textTransform: 'uppercase' },
  input: { borderWidth: 1.5, borderRadius: 16, padding: 18, fontSize: 16, fontWeight: '700' },
  phoneWrapper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 16, paddingHorizontal: 18 },
  prefix: { fontSize: 18, fontWeight: '800' },
  phoneInput: { flex: 1, height: 60, fontSize: 20, fontWeight: '800' },
  summaryContainer: { marginBottom: 35, paddingHorizontal: 5 },
  summaryLine: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  totalLine: { marginTop: 15, paddingTop: 20, borderTopWidth: 2, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 16, fontWeight: '900', letterSpacing: 0.5 },
  totalAmount: { fontSize: 32, fontWeight: '900' },
  submitBtn: { height: 70, borderRadius: 22, alignItems: 'center', justifyContent: 'center', elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
  submitBtnText: { color: '#fff', fontSize: 18, fontWeight: '900', letterSpacing: 1 },
  backBtn: { marginTop: 30, alignItems: 'center', padding: 15 }
});