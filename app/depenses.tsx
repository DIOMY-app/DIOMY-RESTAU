/**
 * ClotureScreen - O'PIED DU MONT Mobile
 * Emplacement : /app/cloture.tsx
 * Correction : Remplacement de 'pt' par 'paddingTop' et nettoyage des styles
 */

import React, { useState, useEffect } from 'react';
import { 
  View, Text, ScrollView, TextInput, StyleSheet, 
  TouchableOpacity, Alert, ActivityIndicator 
} from 'react-native';
import { ScreenContainer } from '../components/screen-container';
import { useColors } from '../hooks/use-colors';
import { supabase } from '../supabase';
import { formatPrice } from '../formatting';
import { useApp } from '../app-context';

interface TotauxTheoriques {
  especes: number;
  wave: number;
  orange_money: number;
  total_ventes: number;
}

export default function ClotureScreen() {
  const colors = useColors();
  const { state } = useApp();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [theorique, setTheorique] = useState<TotauxTheoriques>({ 
    especes: 0, wave: 0, orange_money: 0, total_ventes: 0 
  });
  
  const [physique, setPhysique] = useState({
    especes: '',
    wave: '',
    orange_money: ''
  });

  useEffect(() => {
    fetchDailyStats();
  }, []);

  const fetchDailyStats = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('transactions')
        .select('montant_total, mode_paiement')
        .gte('creee_a', `${today}T00:00:00Z`);

      if (error) throw error;

      const stats = (data || []).reduce((acc, curr) => {
        const mode = curr.mode_paiement?.toLowerCase();
        const mnt = Number(curr.montant_total);
        if (mode === 'especes') acc.especes += mnt;
        else if (mode === 'wave') acc.wave += mnt;
        else if (mode === 'orange_money') acc.orange_money += mnt;
        acc.total_ventes += mnt;
        return acc;
      }, { especes: 0, wave: 0, orange_money: 0, total_ventes: 0 });

      setTheorique(stats);
    } catch (err) {
      Alert.alert("Erreur", "Impossible de charger les ventes du jour.");
    } finally {
      setLoading(false);
    }
  };

  const validerCloture = async () => {
    if (!state?.user?.id) {
      Alert.alert("Erreur", "Session utilisateur introuvable.");
      return;
    }

    const totalVerse = Number(physique.especes) + Number(physique.wave) + Number(physique.orange_money);
    const ecart = totalVerse - theorique.total_ventes;

    Alert.alert(
      "Verser à la comptabilité",
      `Total à verser : ${formatPrice(totalVerse)}\nÉcart sur ventes : ${formatPrice(ecart)}`,
      [
        { text: "Modifier", style: "cancel" },
        { 
          text: "Confirmer le Versement", 
          onPress: async () => {
            setSubmitting(true);
            try {
              const { error } = await supabase.from('clotures').insert([{
                caissier_id: state.user!.id,
                total_theorique: theorique.total_ventes,
                total_physique: totalVerse,
                ecart: ecart,
                type_cloture: 'versement_compta',
                creee_a: new Date().toISOString()
              }]);

              if (error) throw error;
              Alert.alert("Succès", "Le versement a été enregistré.");
              setPhysique({ especes: '', wave: '', orange_money: '' });
            } catch (e: any) {
              Alert.alert("Erreur", e.message);
            } finally {
              setSubmitting(false);
            }
          }
        }
      ]
    );
  };

  if (loading) return <ActivityIndicator style={{ flex: 1 }} color={colors.primary} />;

  return (
    <ScreenContainer>
      <ScrollView style={styles.container}>
        <Text style={[styles.title, { color: colors.foreground }]}>Versement Compta</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>Point des ventes à reverser</Text>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.primary }]}>RECETTES À REVERSER (THÉORIQUE)</Text>
          <View style={styles.row}>
            <Text style={{ color: colors.muted }}>Espèces :</Text>
            <Text style={styles.val}>{formatPrice(theorique.especes)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={{ color: colors.muted }}>Wave :</Text>
            <Text style={styles.val}>{formatPrice(theorique.wave)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={{ color: colors.muted }}>Orange Money :</Text>
            <Text style={styles.val}>{formatPrice(theorique.orange_money)}</Text>
          </View>
          
          <View style={[styles.row, styles.totalRowSeparator, { borderTopColor: colors.border }]}>
            <Text style={{ fontWeight: '900', color: colors.foreground }}>TOTAL GÉNÉRAL :</Text>
            <Text style={{ fontWeight: '900', color: colors.primary }}>{formatPrice(theorique.total_ventes)}</Text>
          </View>
        </View>

        <View style={styles.inputSection}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>MONTANTS RÉELLEMENT VERSÉS</Text>
          
          <Text style={styles.label}>Espèces remis</Text>
          <TextInput 
            style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
            keyboardType="numeric"
            placeholder="0"
            value={physique.especes}
            onChangeText={(v) => setPhysique({...physique, especes: v})}
          />

          <Text style={styles.label}>Transfert Wave effectué</Text>
          <TextInput 
            style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
            keyboardType="numeric"
            placeholder="0"
            value={physique.wave}
            onChangeText={(v) => setPhysique({...physique, wave: v})}
          />

          <Text style={styles.label}>Transfert Orange Money effectué</Text>
          <TextInput 
            style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
            keyboardType="numeric"
            placeholder="0"
            value={physique.orange_money}
            onChangeText={(v) => setPhysique({...physique, orange_money: v})}
          />
        </View>

        <TouchableOpacity 
          style={[styles.btn, { backgroundColor: colors.primary }]}
          onPress={validerCloture}
          disabled={submitting}
        >
          <Text style={styles.btnText}>{submitting ? "Enregistrement..." : "CONFIRMER LE VERSEMENT"}</Text>
        </TouchableOpacity>
        <View style={{ height: 40 }} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 28, fontWeight: '900' },
  subtitle: { fontSize: 14, marginBottom: 25 },
  card: { padding: 20, borderRadius: 20, borderWidth: 1, marginBottom: 30 },
  cardTitle: { fontSize: 11, fontWeight: '900', marginBottom: 15, letterSpacing: 1 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  totalRowSeparator: { marginTop: 10, borderTopWidth: 1, paddingTop: 10 },
  val: { color: '#000', fontWeight: '700' },
  inputSection: { marginBottom: 30 },
  sectionTitle: { fontSize: 16, fontWeight: '800', marginBottom: 15 },
  label: { fontSize: 12, color: '#888', marginBottom: 5 },
  input: { height: 50, borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 15, fontSize: 18, fontWeight: '700', marginBottom: 15 },
  btn: { height: 60, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  btnText: { color: 'white', fontWeight: '900', fontSize: 16 }
});