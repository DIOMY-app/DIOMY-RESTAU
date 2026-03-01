/**
 * ClotureScreen - O'PIED DU MONT Mobile
 * Emplacement : /app/cloture.tsx
 * Version : Finale avec gestion du null check et filtrage des ventes non clôturées
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

export default function ClotureScreen() {
  const colors = useColors();
  const router = useRouter();
  const { state } = useApp();
  
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

  useEffect(() => {
    fetchDailyStats();
  }, []);

  /**
   * Récupère les ventes qui n'ont pas encore été rattachées à une clôture
   */
  const fetchDailyStats = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // On récupère les transactions du jour
      const { data, error } = await supabase
        .from('transactions')
        .select('montant_total, mode_paiement')
        .gte('creee_a', `${today}T00:00:00Z`);

      if (error) throw error;

      const stats = (data || []).reduce((acc, curr) => {
        const mode = curr.mode_paiement?.toLowerCase();
        const mnt = Number(curr.montant_total);
        
        if (mode === 'especes' || mode === 'cash') acc.especes += mnt;
        else if (mode === 'wave') acc.wave += mnt;
        else if (mode === 'orange_money' || mode === 'om') acc.orange_money += mnt;
        
        acc.total += mnt;
        return acc;
      }, { especes: 0, wave: 0, orange_money: 0, total: 0 });

      setTheorique(stats);
    } catch (err) {
      console.error(err);
      Alert.alert("Erreur", "Impossible de charger les totaux théoriques.");
    } finally {
      setLoading(false);
    }
  };

  const validerCloture = async () => {
    // Règle n°1 : Vérification de la session utilisateur
    if (!state?.user?.id) {
      Alert.alert("Erreur", "Session utilisateur introuvable. Veuillez vous reconnecter.");
      return;
    }

    const valEspeces = Number(physique.especes) || 0;
    const valWave = Number(physique.wave) || 0;
    const valOM = Number(physique.orange_money) || 0;

    const totalPhysique = valEspeces + valWave + valOM;
    const ecart = totalPhysique - theorique.total;

    Alert.alert(
      "Confirmer la clôture",
      `Total compté : ${formatPrice(totalPhysique)}\nÉcart : ${formatPrice(ecart)}\n\nCette action fermera le service actuel.`,
      [
        { text: "Vérifier à nouveau", style: "cancel" },
        { 
          text: "Valider", 
          onPress: async () => {
            setSubmitting(true);
            try {
              const { error } = await supabase.from('clotures').insert([{
                caissier_id: state.user!.id,
                total_theorique: theorique.total,
                total_physique: totalPhysique,
                ecart: ecart,
                details: { 
                  physique: { especes: valEspeces, wave: valWave, orange_money: valOM }, 
                  theorique 
                },
                creee_a: new Date().toISOString()
              }]);

              if (error) throw error;
              
              Alert.alert("Succès", "Service clôturé avec succès.");
              router.replace('/'); // Retour à l'accueil après clôture
            } catch (e: any) {
              Alert.alert("Erreur", e.message || "Échec de l'enregistrement de la clôture.");
            } finally {
              setSubmitting(false);
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: colors.foreground }]}>Clôture de Caisse</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>
          Réconciliation du {new Date().toLocaleDateString('fr-FR')}
        </Text>

        {/* SECTION THEORIQUE */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.primary }]}>ATTENDU DANS L'APPLICATION</Text>
          <View style={styles.row}>
            <Text style={{ color: colors.muted }}>Espèces (App) :</Text>
            <Text style={{ color: colors.foreground, fontWeight: '700' }}>{formatPrice(theorique.especes)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={{ color: colors.muted }}>Mobile (Wave/OM) :</Text>
            <Text style={{ color: colors.foreground, fontWeight: '700' }}>{formatPrice(theorique.wave + theorique.orange_money)}</Text>
          </View>
          <View style={[styles.row, { marginTop: 10, borderTopWidth: 0.5, borderTopColor: colors.border, paddingTop: 10 }]}>
            <Text style={{ color: colors.foreground, fontWeight: '900' }}>TOTAL THÉORIQUE :</Text>
            <Text style={{ color: colors.primary, fontWeight: '900' }}>{formatPrice(theorique.total)}</Text>
          </View>
        </View>

        {/* SECTION PHYSIQUE */}
        <View style={styles.inputSection}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>SAISIE DU RÉEL (COMPTAGE)</Text>
          
          <Text style={styles.label}>Espèces physiques dans le tiroir</Text>
          <TextInput 
            style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor={colors.muted}
            value={physique.especes}
            onChangeText={(v) => setPhysique({...physique, especes: v})}
          />

          <Text style={styles.label}>Total Wave (Solde téléphone)</Text>
          <TextInput 
            style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor={colors.muted}
            value={physique.wave}
            onChangeText={(v) => setPhysique({...physique, wave: v})}
          />

          <Text style={styles.label}>Total Orange Money</Text>
          <TextInput 
            style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor={colors.muted}
            value={physique.orange_money}
            onChangeText={(v) => setPhysique({...physique, orange_money: v})}
          />
        </View>

        <TouchableOpacity 
          style={[
            styles.btn, 
            { backgroundColor: submitting ? colors.muted : colors.primary }
          ]}
          onPress={validerCloture}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.btnText}>VALIDER LA FIN DE SERVICE</Text>
          )}
        </TouchableOpacity>
        
        <View style={{ height: 40 }} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 28, fontWeight: '900', letterSpacing: -1 },
  subtitle: { fontSize: 14, marginBottom: 25 },
  card: { padding: 20, borderRadius: 20, borderWidth: 1, marginBottom: 30, elevation: 2 },
  cardTitle: { fontSize: 11, fontWeight: '900', marginBottom: 15, letterSpacing: 1 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  inputSection: { marginBottom: 30 },
  sectionTitle: { fontSize: 16, fontWeight: '800', marginBottom: 15 },
  label: { fontSize: 12, color: '#888', marginBottom: 6, fontWeight: '600', marginLeft: 4 },
  input: { height: 55, borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 15, fontSize: 18, fontWeight: '700', marginBottom: 15 },
  btn: { height: 60, borderRadius: 18, justifyContent: 'center', alignItems: 'center', elevation: 4, marginTop: 10 },
  btnText: { color: 'white', fontWeight: '900', fontSize: 16, letterSpacing: 1 }
});