/**
 * DepensesScreen - O'PIED DU MONT
 * Emplacement : /app/depenses.tsx
 * Rôle : Saisie des dépenses par la Comptabilité (Achats hors caisse)
 */

import React, { useState } from 'react';
import { 
  View, Text, ScrollView, TextInput, StyleSheet, 
  TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform 
} from 'react-native';
import { ScreenContainer } from '../components/screen-container';
import { useColors } from '../hooks/use-colors';
import { supabase } from '../supabase';
import { useApp } from '../app-context';
import { useRouter } from 'expo-router';

export default function DepensesScreen() {
  const colors = useColors();
  const router = useRouter();
  const { state } = useApp();
  
  const [submitting, setSubmitting] = useState(false);
  const [motif, setMotif] = useState('');
  const [montant, setMontant] = useState('');
  const [categorie, setCategorie] = useState<'marché' | 'charge' | 'autre'>('marché');

  const enregistrerDepense = async () => {
    if (!motif || !montant) {
      Alert.alert("Erreur", "Veuillez remplir le motif et le montant.");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('depenses_compta') // Table dédiée aux dépenses de la compta
        .insert([{
          motif: motif,
          montant: parseFloat(montant),
          categorie: categorie,
          enregistre_par: state.user?.id,
          creee_a: new Date().toISOString()
        }]);

      if (error) throw error;

      Alert.alert("Succès", "Dépense enregistrée avec succès.");
      setMotif('');
      setMontant('');
      router.back();
    } catch (error: any) {
      Alert.alert("Erreur", error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenContainer>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={[styles.title, { color: colors.foreground }]}>Dépenses Compta</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            Enregistrez les sorties d'argent effectuées par la comptabilité.
          </Text>

          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.label, { color: colors.muted }]}>MOTIF DE LA DÉPENSE</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
              placeholder="Ex: Sac de charbon, Transport, Sel..."
              placeholderTextColor="#999"
              value={motif}
              onChangeText={setMotif}
            />

            <Text style={[styles.label, { color: colors.muted, marginTop: 20 }]}>MONTANT (FCFA)</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
              placeholder="0"
              keyboardType="numeric"
              value={montant}
              onChangeText={setMontant}
            />

            <Text style={[styles.label, { color: colors.muted, marginTop: 20 }]}>CATÉGORIE</Text>
            <View style={styles.categoryRow}>
              {(['marché', 'charge', 'autre'] as const).map((cat) => (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setCategorie(cat)}
                  style={[
                    styles.catBtn,
                    { borderColor: colors.border },
                    categorie === cat && { backgroundColor: colors.primary, borderColor: colors.primary }
                  ]}
                >
                  <Text style={[
                    styles.catText, 
                    { color: colors.foreground },
                    categorie === cat && { color: '#FFF' }
                  ]}>
                    {cat.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity 
            style={[styles.btn, { backgroundColor: colors.primary }]}
            onPress={enregistrerDepense}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.btnText}>VALIDER LA DÉPENSE</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { padding: 25 },
  title: { fontSize: 28, fontWeight: '900', letterSpacing: -1 },
  subtitle: { fontSize: 14, marginBottom: 30, lineHeight: 20 },
  card: { padding: 20, borderRadius: 24, borderWidth: 1, marginBottom: 30, elevation: 2 },
  label: { fontSize: 11, fontWeight: '900', marginBottom: 8, letterSpacing: 1 },
  input: { 
    borderWidth: 1.5, 
    borderRadius: 14, 
    padding: 15, 
    fontSize: 16, 
    fontWeight: '600' 
  },
  categoryRow: { flexDirection: 'row', gap: 10, marginTop: 5 },
  catBtn: { 
    flex: 1, 
    paddingVertical: 10, 
    borderRadius: 10, 
    borderWidth: 1, 
    alignItems: 'center' 
  },
  catText: { fontSize: 10, fontWeight: '800' },
  btn: { 
    borderRadius: 18, 
    paddingVertical: 18, 
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5
  },
  btnText: { color: 'white', fontWeight: '900', fontSize: 15, letterSpacing: 1 }
});