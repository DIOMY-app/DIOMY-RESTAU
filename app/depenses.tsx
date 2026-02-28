/**
 * DepensesScreen - O'PIED DU MONT Mobile
 * Emplacement : /app/depenses.tsx
 * Fonctionnalité : Enregistrement et suivi des charges d'exploitation
 */

import React, { useState, useEffect } from 'react';
import { 
  View, Text, ScrollView, StyleSheet, TextInput, 
  TouchableOpacity, Alert, ActivityIndicator, FlatList 
} from 'react-native';
import { ScreenContainer } from '../components/screen-container';
import { useColors } from '../hooks/use-colors';
import { supabase } from '../supabase';
import { useApp } from '../app-context';
import { formatPrice } from '../formatting';

const CATEGORIES = ['Achats Marché', 'Charbon/Gaz', 'Salaires', 'Transport', 'Loyer/Charges', 'Divers'];

export default function DepensesScreen() {
  const colors = useColors();
  const { state } = useApp();
  
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [depenses, setDepenses] = useState<any[]>([]);

  // Formulaire
  const [montant, setMontant] = useState('');
  const [description, setDescription] = useState('');
  const [categorie, setCategorie] = useState(CATEGORIES[0]);

  const fetchDepenses = async () => {
    try {
      const { data, error } = await supabase
        .from('depenses')
        .select('*')
        .order('creee_a', { ascending: false })
        .limit(20);

      if (error) throw error;
      setDepenses(data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchDepenses();
  }, []);

  const handleAddDepense = async () => {
    if (!montant || isNaN(Number(montant))) {
      Alert.alert("Erreur", "Veuillez saisir un montant valide.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('depenses')
        .insert([{
          montant: Number(montant),
          categorie,
          description,
          employe_id: state.user?.id
        }]);

      if (error) throw error;

      Alert.alert("Succès", "Dépense enregistrée.");
      setMontant('');
      setDescription('');
      fetchDepenses(); // Recharger la liste
    } catch (error: any) {
      Alert.alert("Erreur", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.foreground }]}>Dépenses</Text>
          <Text style={{ color: colors.muted }}>Sorties de caisse et charges</Text>
        </View>

        {/* FORMULAIRE D'AJOUT */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.label, { color: colors.foreground }]}>Nouveau décaissement</Text>
          
          <TextInput
            style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
            placeholder="Montant (FCFA)"
            placeholderTextColor={colors.muted}
            keyboardType="numeric"
            value={montant}
            onChangeText={setMontant}
          />

          <Text style={[styles.subLabel, { color: colors.muted }]}>Catégorie</Text>
          <View style={styles.catContainer}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity 
                key={cat}
                onPress={() => setCategorie(cat)}
                style={[
                  styles.catBadge, 
                  { 
                    backgroundColor: categorie === cat ? colors.primary : colors.background,
                    borderColor: colors.border 
                  }
                ]}
              >
                <Text style={{ 
                  color: categorie === cat ? '#fff' : colors.muted, 
                  fontSize: 10, 
                  fontWeight: '700' 
                }}>
                  {cat.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            style={[styles.input, { borderColor: colors.border, color: colors.foreground, height: 80 }]}
            placeholder="Description (ex: Achat de 2 sacs de charbon)"
            placeholderTextColor={colors.muted}
            multiline
            value={description}
            onChangeText={setDescription}
          />

          <TouchableOpacity 
            style={[styles.submitBtn, { backgroundColor: colors.primary }]}
            onPress={handleAddDepense}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>ENREGISTRER LA DÉPENSE</Text>}
          </TouchableOpacity>
        </View>

        {/* LISTE DES DERNIÈRES DÉPENSES */}
        <View style={styles.historySection}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Historique Récent</Text>
          {fetching ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            depenses.map((item) => (
              <View key={item.id} style={[styles.depenseItem, { borderBottomColor: colors.border }]}>
                <View>
                  <Text style={[styles.depenseCat, { color: colors.primary }]}>{item.categorie}</Text>
                  <Text style={[styles.depenseDesc, { color: colors.foreground }]}>{item.description || 'Sans description'}</Text>
                  <Text style={{ color: colors.muted, fontSize: 10 }}>{new Date(item.creee_a).toLocaleDateString()}</Text>
                </View>
                <Text style={[styles.depenseAmount, { color: colors.error }]}>-{formatPrice(item.montant)}</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  header: { marginBottom: 20 },
  title: { fontSize: 28, fontWeight: '900' },
  card: { padding: 20, borderRadius: 24, borderWidth: 1, elevation: 2 },
  label: { fontSize: 16, fontWeight: '800', marginBottom: 15 },
  subLabel: { fontSize: 12, fontWeight: '700', marginBottom: 10, marginTop: 10 },
  input: { borderWidth: 1.5, borderRadius: 12, padding: 12, marginBottom: 15, fontSize: 16 },
  catContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 15 },
  catBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  submitBtn: { padding: 16, borderRadius: 15, alignItems: 'center', marginTop: 10 },
  submitBtnText: { color: '#fff', fontWeight: '900', fontSize: 14 },
  historySection: { marginTop: 30 },
  sectionTitle: { fontSize: 18, fontWeight: '800', marginBottom: 15 },
  depenseItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1 },
  depenseCat: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  depenseDesc: { fontSize: 14, fontWeight: '600', marginVertical: 2 },
  depenseAmount: { fontSize: 16, fontWeight: '900' }
});