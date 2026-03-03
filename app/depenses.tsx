/**
 * DepensesScreen - O'PIED DU MONT
 * Emplacement : /app/depenses.tsx
 * Version : 2.0 - Liaison Stock & Historique Rapide
 */

import React, { useState, useEffect } from 'react';
import { 
  View, Text, ScrollView, TextInput, StyleSheet, 
  TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, FlatList 
} from 'react-native';
import { ScreenContainer } from '../components/screen-container';
import { useColors } from '../hooks/use-colors';
import { supabase } from '../supabase';
import { useApp } from '../app-context';
import { useRouter } from 'expo-router';
import { refreshAppData } from '../services/data-service';

export default function DepensesScreen() {
  const colors = useColors();
  const router = useRouter();
  const { state, dispatch } = useApp();
  
  // États du formulaire
  const [submitting, setSubmitting] = useState(false);
  const [motif, setMotif] = useState('');
  const [montant, setMontant] = useState('');
  const [quantiteAchetee, setQuantiteAchetee] = useState(''); // Pour le stock
  const [categorie, setCategorie] = useState<'marché' | 'charge' | 'autre'>('marché');
  const [selectedStockId, setSelectedStockId] = useState<string | null>(null);

  // État historique
  const [recentDepenses, setRecentDepenses] = useState<any[]>([]);

  useEffect(() => {
    loadRecentDepenses();
  }, []);

  const loadRecentDepenses = async () => {
    const { data } = await supabase
      .from('depenses_compta')
      .select('*')
      .order('creee_a', { ascending: false })
      .limit(3);
    if (data) setRecentDepenses(data);
  };

  const enregistrerDepense = async () => {
    // 1. Validations de base
    if (!motif || !montant) {
      return Alert.alert("Erreur", "Veuillez remplir le motif et le montant.");
    }

    // 2. Nettoyage du montant (remplacement virgule par point)
    const montantPropre = parseFloat(montant.replace(',', '.'));
    const qtePropre = parseFloat(quantiteAchetee.replace(',', '.'));

    if (isNaN(montantPropre)) {
      return Alert.alert("Erreur", "Le montant saisi n'est pas valide.");
    }

    setSubmitting(true);
    try {
      // A. Insertion de la dépense
      const { data: depenseData, error: depenseError } = await supabase
        .from('depenses_compta')
        .insert([{
          motif: motif,
          montant: montantPropre,
          categorie: categorie,
          enregistre_par: state.user?.id,
          stock_lie_id: categorie === 'marché' ? selectedStockId : null,
          creee_a: new Date().toISOString()
        }])
        .select();

      if (depenseError) throw depenseError;

      // B. Mise à jour du stock (si catégorie marché et article sélectionné)
      if (categorie === 'marché' && selectedStockId && !isNaN(qtePropre)) {
        // On récupère la quantité actuelle pour l'incrémenter
        const { data: stockData } = await supabase
          .from('stock')
          .select('quantite')
          .eq('id', parseInt(selectedStockId))
          .single();

        const nouvelleQte = (stockData?.quantite || 0) + qtePropre;

        const { error: stockError } = await supabase
          .from('stock')
          .update({ quantite: nouvelleQte })
          .eq('id', parseInt(selectedStockId));

        if (stockError) console.error("Erreur mise à jour stock:", stockError.message);
      }

      Alert.alert("Succès", "Dépense enregistrée et stock mis à jour.");
      
      // Rafraîchir les données globales
      await refreshAppData(dispatch);
      
      // Reset et retour
      setMotif('');
      setMontant('');
      setQuantiteAchetee('');
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
            Enregistrez les sorties d'argent et mettez à jour le stock en un clic.
          </Text>

          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.label, { color: colors.muted }]}>CATÉGORIE</Text>
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
                  <Text style={[styles.catText, { color: categorie === cat ? '#FFF' : colors.foreground }]}>
                    {cat.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Section spécifique au Marché / Stock */}
            {categorie === 'marché' && (
              <View style={{ marginTop: 20 }}>
                <Text style={[styles.label, { color: colors.muted }]}>LIER À UN ARTICLE EN STOCK (OPTIONNEL)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                  {state.stockItems?.map((item: any) => (
                    <TouchableOpacity
                      key={item.id}
                      onPress={() => setSelectedStockId(selectedStockId === item.id ? null : item.id)}
                      style={[
                        styles.stockBadge,
                        { borderColor: colors.border, backgroundColor: selectedStockId === item.id ? colors.primary : 'transparent' }
                      ]}
                    >
                      <Text style={{ fontSize: 12, color: selectedStockId === item.id ? '#FFF' : colors.foreground }}>
                        {item.nom || item.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                
                {selectedStockId && (
                  <TextInput
                    style={[styles.input, { borderColor: colors.primary, color: colors.foreground, marginTop: 5 }]}
                    placeholder="Quantité à ajouter au stock..."
                    keyboardType="numeric"
                    value={quantiteAchetee}
                    onChangeText={setQuantiteAchetee}
                  />
                )}
              </View>
            )}

            <Text style={[styles.label, { color: colors.muted, marginTop: 20 }]}>MOTIF DE LA DÉPENSE</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
              placeholder="Ex: Sac de charbon, Transport..."
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

          {/* Historique Rapide */}
          <View style={{ marginTop: 40 }}>
            <Text style={[styles.label, { color: colors.muted }]}>DERNIÈRES SAISIES</Text>
            {recentDepenses.map((d) => (
              <View key={d.id} style={[styles.historyRow, { borderBottomColor: colors.border }]}>
                <Text style={{ color: colors.foreground, flex: 1 }}>{d.motif}</Text>
                <Text style={{ color: colors.primary, fontWeight: '800' }}>{d.montant} F</Text>
              </View>
            ))}
          </View>
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
  input: { borderWidth: 1.5, borderRadius: 14, padding: 15, fontSize: 16, fontWeight: '600' },
  categoryRow: { flexDirection: 'row', gap: 10, marginTop: 5 },
  catBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  catText: { fontSize: 10, fontWeight: '800' },
  stockBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, marginRight: 8 },
  btn: { borderRadius: 18, paddingVertical: 18, alignItems: 'center', elevation: 4 },
  btnText: { color: 'white', fontWeight: '900', fontSize: 15, letterSpacing: 1 },
  historyRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1 }
});