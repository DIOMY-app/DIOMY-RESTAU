/**
 * ClotureScreen - O'PIED DU MONT Mobile
 * Emplacement : /app/cloture.tsx
 * Version : 2.5 - Réconciliation Session + Alerte Écart + Justification
 * Règle n°2 : Toujours fournir le code complet.
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
import { useRouter } from 'expo-router';

interface TotauxTheoriques {
  especes: number;
  wave: number;
  orange_money: number;
  total: number;
}

// Seuil à partir duquel la justification devient obligatoire
const SEUIL_CRITIQUE = 5000;

export default function ClotureScreen() {
  const colors = useColors();
  const router = useRouter();
  const { state, actions } = useApp();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [theorique, setTheorique] = useState<TotauxTheoriques>({ 
    especes: 0, wave: 0, orange_money: 0, total: 0 
  });
  
  const [physique, setPhysique] = useState({
    especes: '',
    wave: '',
    orange_money: ''
  });

  const [commentaire, setCommentaire] = useState('');

  useEffect(() => {
    fetchSessionStats();
  }, []);

  /**
   * Récupère les ventes liées à la session actuelle
   */
  const fetchSessionStats = async () => {
    if (!state.currentSession?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('montant_total, mode_paiement')
        .eq('session_id', state.currentSession.id);

      if (error) throw error;

      const stats = (data || []).reduce((acc, curr) => {
        const mode = curr.mode_paiement?.toLowerCase();
        const mnt = Number(curr.montant_total) || 0;
        
        if (mode === 'especes' || mode === 'cash') acc.especes += mnt;
        else if (mode === 'wave') acc.wave += mnt;
        else if (mode === 'orange_money' || mode === 'om') acc.orange_money += mnt;
        
        acc.total += mnt;
        return acc;
      }, { especes: 0, wave: 0, orange_money: 0, total: 0 });

      setTheorique(stats);
    } catch (err) {
      console.error(err);
      Alert.alert("Erreur", "Impossible de calculer les totaux de la session.");
    } finally {
      setLoading(false);
    }
  };

  const validerCloture = async () => {
    if (!state?.user?.id || !state.currentSession?.id) {
      Alert.alert("Action impossible", "Aucune session active trouvée.");
      return;
    }

    const valEspeces = parseFloat(physique.especes) || 0;
    const valWave = parseFloat(physique.wave) || 0;
    const valOM = parseFloat(physique.orange_money) || 0;

    const totalPhysique = valEspeces + valWave + valOM;
    const ecart = totalPhysique - theorique.total;
    const ecartAbsolu = Math.abs(ecart);

    // 1. Vérification si l'écart nécessite une justification obligatoire
    if (ecartAbsolu >= SEUIL_CRITIQUE && commentaire.trim().length < 10) {
      Alert.alert(
        "Justification obligatoire",
        `L'écart de ${formatPrice(ecart)} est trop important. Veuillez expliquer la raison (minimum 10 caractères) avant de pouvoir fermer la caisse.`
      );
      return;
    }

    // 2. Confirmation finale
    Alert.alert(
      "Confirmer la clôture",
      `Attendu : ${formatPrice(theorique.total)}\nCompté : ${formatPrice(totalPhysique)}\nÉcart : ${formatPrice(ecart)}`,
      [
        { text: "Rectifier", style: "cancel" },
        { 
          text: "Confirmer", 
          onPress: () => executerEnregistrement(totalPhysique, ecart, valEspeces, valWave, valOM) 
        }
      ]
    );
  };

  const executerEnregistrement = async (totalPhysique: number, ecart: number, vEsp: number, vW: number, vOM: number) => {
    setSubmitting(true);
    try {
      // 1. Enregistrer la clôture
      const { error: errorCloture } = await supabase.from('clotures').insert([{
        caissier_id: state.user!.id,
        session_id: state.currentSession.id,
        total_theorique: theorique.total,
        total_physique: totalPhysique,
        ecart: ecart,
        details: { 
          repartition_physique: { especes: vEsp, wave: vW, orange_money: vOM }, 
          repartition_theorique: theorique,
          commentaire: commentaire.trim(),
          alerte_critique: Math.abs(ecart) >= SEUIL_CRITIQUE
        },
        creee_a: new Date().toISOString()
      }]);

      if (errorCloture) throw errorCloture;

      // 2. Fermer la session
      const { error: errorSession } = await supabase
        .from('sessions_caisse')
        .update({ 
          statut: 'ferme', 
          fermee_a: new Date().toISOString(),
          montant_final: totalPhysique 
        })
        .eq('id', state.currentSession.id);

      if (errorSession) throw errorSession;
      
      if (actions?.refresh) await actions.refresh();
      
      Alert.alert("Succès ✅", "La session a été fermée avec succès.");
      router.replace('/'); 
    } catch (e: any) {
      Alert.alert("Erreur", e.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Calcul dynamique de l'écart pour l'interface
  const totalSaisi = (parseFloat(physique.especes) || 0) + (parseFloat(physique.wave) || 0) + (parseFloat(physique.orange_money) || 0);
  const ecartActuel = totalSaisi - theorique.total;

  if (!state.currentSession) {
    return (
      <ScreenContainer style={styles.center}>
        <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.foreground }}>Aucune session ouverte</Text>
        <TouchableOpacity style={[styles.btn, { backgroundColor: colors.primary, paddingHorizontal: 30, marginTop: 20 }]} onPress={() => router.back()}>
          <Text style={styles.btnText}>RETOUR</Text>
        </TouchableOpacity>
      </ScreenContainer>
    );
  }

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 10, color: colors.muted }}>Calcul des ventes en cours...</Text>
      </View>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: colors.foreground }]}>Fin de Service</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>
          Session n°{state.currentSession.id.split('-')[0].toUpperCase()}
        </Text>

        {/* RÉCAPITULATIF */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.primary }]}>CHIFFRE D'AFFAIRES ATTENDU</Text>
          <View style={styles.row}>
            <Text style={{ color: colors.muted }}>Ventes Espèces :</Text>
            <Text style={{ color: colors.foreground, fontWeight: '700' }}>{formatPrice(theorique.especes)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={{ color: colors.muted }}>Ventes Mobile :</Text>
            <Text style={{ color: colors.foreground, fontWeight: '700' }}>{formatPrice(theorique.wave + theorique.orange_money)}</Text>
          </View>
          <View style={[styles.row, { marginTop: 15, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10 }]}>
            <Text style={{ color: colors.foreground, fontWeight: '900', fontSize: 16 }}>TOTAL :</Text>
            <Text style={{ color: colors.primary, fontWeight: '900', fontSize: 16 }}>{formatPrice(theorique.total)}</Text>
          </View>
        </View>

        {/* COMPTAGE PHYSIQUE */}
        <View style={styles.inputSection}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Vérification Physique</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>CASH TOTAL (F CFA)</Text>
            <TextInput 
              style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]}
              keyboardType="numeric"
              placeholder="0"
              value={physique.especes}
              onChangeText={(v) => setPhysique({...physique, especes: v})}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>SOLDE WAVE (F CFA)</Text>
            <TextInput 
              style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]}
              keyboardType="numeric"
              placeholder="0"
              value={physique.wave}
              onChangeText={(v) => setPhysique({...physique, wave: v})}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>SOLDE OM (F CFA)</Text>
            <TextInput 
              style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]}
              keyboardType="numeric"
              placeholder="0"
              value={physique.orange_money}
              onChangeText={(v) => setPhysique({...physique, orange_money: v})}
            />
          </View>

          {/* ZONE DE COMMENTAIRE DYNAMIQUE */}
          {ecartActuel !== 0 && (
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: Math.abs(ecartActuel) >= SEUIL_CRITIQUE ? '#ef4444' : colors.primary }]}>
                JUSTIFICATION DE L'ÉCART ({formatPrice(ecartActuel)})
              </Text>
              <TextInput 
                style={[styles.textArea, { color: colors.foreground, borderColor: Math.abs(ecartActuel) >= SEUIL_CRITIQUE ? '#ef4444' : colors.border, backgroundColor: colors.surface }]}
                placeholder="Ex: Erreur rendu monnaie, client parti sans payer..."
                placeholderTextColor={colors.muted}
                multiline
                numberOfLines={3}
                value={commentaire}
                onChangeText={setCommentaire}
              />
            </View>
          )}
        </View>

        <TouchableOpacity 
          style={[styles.btn, { backgroundColor: submitting ? colors.muted : '#22c55e' }]}
          onPress={validerCloture}
          disabled={submitting}
        >
          {submitting ? <ActivityIndicator color="white" /> : <Text style={styles.btnText}>VALIDER LA CLÔTURE</Text>}
        </TouchableOpacity>
        
        <View style={{ height: 40 }} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 30, fontWeight: '900', letterSpacing: -1 },
  subtitle: { fontSize: 14, marginBottom: 25, opacity: 0.6 },
  card: { padding: 20, borderRadius: 24, borderWidth: 1, marginBottom: 30 },
  cardTitle: { fontSize: 10, fontWeight: '900', marginBottom: 15, letterSpacing: 1.5 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  inputSection: { marginBottom: 20 },
  sectionTitle: { fontSize: 15, fontWeight: '800', marginBottom: 20, textTransform: 'uppercase' },
  inputGroup: { marginBottom: 15 },
  label: { fontSize: 11, color: '#888', marginBottom: 8, fontWeight: '700' },
  input: { height: 60, borderWidth: 1.5, borderRadius: 16, paddingHorizontal: 18, fontSize: 20, fontWeight: '800' },
  textArea: { minHeight: 80, borderWidth: 1.5, borderRadius: 16, padding: 15, fontSize: 16, textAlignVertical: 'top' },
  btn: { height: 65, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  btnText: { color: 'white', fontWeight: '900', fontSize: 17, letterSpacing: 1 }
});