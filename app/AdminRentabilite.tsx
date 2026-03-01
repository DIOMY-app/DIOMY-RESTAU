/**
 * AdminRentabilite - Gestion des Coûts et Rentabilité
 * Emplacement : /app/AdminRentabilite.tsx
 */

import React, { useState, useMemo } from 'react';
import { 
  View, Text, ScrollView, StyleSheet, TouchableOpacity, 
  TextInput, Alert, KeyboardAvoidingView, Platform 
} from 'react-native';
import { ScreenContainer } from '../components/screen-container';
import { useApp } from '../app-context';
import { useColors } from '../hooks/use-colors';
import { formatPrice } from '../formatting';

export default function AdminRentabilite() {
  const { state } = useApp();
  const colors = useColors();
  
  // 1. ÉTATS POUR LE MARCHÉ (HEBDOMADAIRE)
  const [prixSacRiz, setPrixSacRiz] = useState('25000');
  const [prixHuileLitre, setPrixHuileLitre] = useState('1200');
  const [fraisMarcheHebdo, setFraisMarcheHebdo] = useState('15000');
  const [prixVentePlat, setPrixVentePlat] = useState('2000');

  // 2. ÉTATS POUR LES CHARGES (MODIFIABLES)
  const [tempCharges, setTempCharges] = useState(state.chargesFixes);
  const [newName, setNewName] = useState('');
  const [newAmount, setNewAmount] = useState('');

  const updateChargeLocally = (id: string, newMontant: string) => {
    setTempCharges(prev => prev.map(c => c.id === id ? { ...c, montant: Number(newMontant) || 0 } : c));
  };

  const addNewCharge = () => {
    if (!newName || !newAmount) {
      Alert.alert("Attention", "Veuillez remplir le nom et le montant.");
      return;
    }
    const newEntry = {
      id: Math.random().toString(),
      nom: newName,
      montant: Number(newAmount),
      periodicite: 'mensuel'
    };
    setTempCharges([...tempCharges, newEntry]);
    setNewName('');
    setNewAmount('');
  };

  const calculs = useMemo(() => {
    // Coût Ingrédients par plat (sur une base de 30 plats)
    const rizPourUnPlat = (Number(prixSacRiz) / 50) * 0.16; // ex: 160g par plat
    const huilePourUnPlat = Number(prixHuileLitre) * 0.05; // ex: 5cl par plat
    const legumesParPlat = (Number(fraisMarcheHebdo) / 7) / 30;
    const matiereParPlat = rizPourUnPlat + huilePourUnPlat + legumesParPlat;

    // Coût Structure (Loyer, WiFi, Tel, Salaires...)
    const totalChargesFixes = tempCharges.reduce((acc, curr) => acc + Number(curr.montant), 0);
    const structureParPlat = (totalChargesFixes / 30) / 40; // Base 40 plats/jour

    const benefice = Number(prixVentePlat) - (matiereParPlat + structureParPlat);
    const total = Number(prixVentePlat) || 1;

    return {
      matiere: matiereParPlat,
      structure: structureParPlat,
      benefice,
      pMatiere: (matiereParPlat / total) * 100,
      pStructure: (structureParPlat / total) * 100,
      pBenefice: (benefice / total) * 100
    };
  }, [prixSacRiz, prixHuileLitre, fraisMarcheHebdo, prixVentePlat, tempCharges]);

  return (
    <ScreenContainer>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{flex:1}}>
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Analyse de Rentabilité</Text>

          {/* GRAPHIQUE DE RÉPARTITION */}
          <View style={[styles.chartCard, { backgroundColor: colors.surface }]}>
            <Text style={styles.cardTitle}>RÉPARTITION DU PRIX D'UN PLAT</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressSegment, { width: `${Math.max(0, calculs.pMatiere)}%`, backgroundColor: '#F87171' }]} />
              <View style={[styles.progressSegment, { width: `${Math.max(0, calculs.pStructure)}%`, backgroundColor: '#FBBF24' }]} />
              <View style={[styles.progressSegment, { width: `${Math.max(0, calculs.pBenefice)}%`, backgroundColor: '#34D399' }]} />
            </View>
            <View style={styles.legendRow}>
              <LegendItem color="#F87171" label="Ingrédients" val={calculs.pMatiere} />
              <LegendItem color="#FBBF24" label="Charges Fixes" val={calculs.pStructure} />
              <LegendItem color="#34D399" label="Bénéfice Net" val={calculs.pBenefice} />
            </View>
          </View>

          {/* SECTION MARCHÉ */}
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <Text style={styles.cardSubTitle}>🛒 Marché Hebdomadaire</Text>
            <InputField label="Prix Sac de Riz (50kg)" value={prixSacRiz} onChange={setPrixSacRiz} />
            <InputField label="Prix Vente du Plat" value={prixVentePlat} onChange={setPrixVentePlat} highlight />
          </View>

          {/* CONFIGURATION DES CHARGES */}
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <Text style={styles.cardSubTitle}>⚙️ Gestion des Charges Fixes</Text>
            
            <View style={styles.addForm}>
              <TextInput 
                placeholder="Nom (ex: WiFi)" 
                style={[styles.addInput, { flex: 2 }]} 
                value={newName} 
                onChangeText={setNewName} 
              />
              <TextInput 
                placeholder="Montant" 
                style={[styles.addInput, { flex: 1 }]} 
                keyboardType="numeric" 
                value={newAmount} 
                onChangeText={setNewAmount} 
              />
              <TouchableOpacity style={styles.addButton} onPress={addNewCharge}>
                <Text style={styles.addButtonText}>+</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.divider} />

            {tempCharges.map((charge) => (
              <View key={charge.id} style={styles.chargeRow}>
                <Text style={styles.chargeName}>{charge.nom}</Text>
                <TextInput 
                  style={[styles.chargeInput, { borderColor: colors.border }]}
                  keyboardType="numeric"
                  value={charge.montant.toString()}
                  onChangeText={(val) => updateChargeLocally(charge.id, val)}
                />
              </View>
            ))}
          </View>

          {/* BILAN FINAL */}
          <View style={[styles.totalCard, { backgroundColor: calculs.benefice > 0 ? '#34D399' : '#F87171' }]}>
            <Text style={styles.totalLabel}>MON GAIN RÉEL PAR PLAT</Text>
            <Text style={styles.totalValue}>{formatPrice(calculs.benefice)}</Text>
          </View>

          <TouchableOpacity style={[styles.saveBtn, {backgroundColor: colors.primary}]} onPress={() => Alert.alert("Succès", "Données mises à jour.")}>
            <Text style={styles.saveBtnText}>ENREGISTRER</Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const LegendItem = ({ color, label, val }: any) => (
  <View style={styles.legendItem}>
    <View style={[styles.dot, { backgroundColor: color }]} />
    <Text style={styles.legendText}>{label} ({Math.round(val)}%)</Text>
  </View>
);

const InputField = ({ label, value, onChange, highlight }: any) => (
  <View style={styles.inputGroup}>
    <Text style={styles.label}>{label}</Text>
    <TextInput style={[styles.input, highlight && { borderColor: '#6366F1', borderWidth: 2 }]} keyboardType="numeric" value={value} onChangeText={onChange} />
  </View>
);

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 60 },
  headerTitle: { fontSize: 24, fontWeight: '900', marginBottom: 20 },
  chartCard: { borderRadius: 20, padding: 20, marginBottom: 20, elevation: 2 },
  cardTitle: { fontSize: 11, fontWeight: '700', marginBottom: 12, color: '#64748b', letterSpacing: 1 },
  progressBar: { height: 35, flexDirection: 'row', borderRadius: 10, overflow: 'hidden' },
  progressSegment: { height: '100%' },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 15, gap: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 5 },
  legendText: { fontSize: 11, fontWeight: '600', color: '#64748b' },
  card: { borderRadius: 20, padding: 20, marginBottom: 20 },
  cardSubTitle: { fontSize: 17, fontWeight: '800', marginBottom: 15 },
  addForm: { flexDirection: 'row', gap: 8, marginBottom: 15 },
  addInput: { backgroundColor: '#f8fafc', borderRadius: 8, padding: 10, fontSize: 13, borderWidth: 1, borderColor: '#e2e8f0' },
  addButton: { backgroundColor: '#6366F1', width: 45, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  addButtonText: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  divider: { height: 1, backgroundColor: '#f1f5f9', marginBottom: 15 },
  inputGroup: { marginBottom: 12 },
  label: { fontSize: 11, color: '#94a3b8', marginBottom: 4, fontWeight: '700' },
  input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 10, fontSize: 15 },
  chargeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  chargeName: { fontSize: 14, color: '#334155', fontWeight: '600', flex: 1 },
  chargeInput: { borderWidth: 1, borderRadius: 8, padding: 8, width: 90, textAlign: 'right' },
  totalCard: { borderRadius: 20, padding: 25, alignItems: 'center', marginBottom: 20 },
  totalLabel: { color: '#fff', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  totalValue: { color: '#fff', fontSize: 34, fontWeight: '900' },
  saveBtn: { padding: 18, borderRadius: 15, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '900' }
});