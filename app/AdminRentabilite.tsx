/**
 * AdminRentabilite - Gestion des Coûts et Rentabilité
 * Emplacement : /app/AdminRentabilite.tsx
 * Version : Pilotage par Chiffre d'Affaires (Remplace le comptage par plats)
 * Règle n°2 : Code complet fourni.
 */

import React, { useState, useMemo, useEffect } from 'react';
import { 
  View, Text, ScrollView, StyleSheet, TouchableOpacity, 
  TextInput, Alert, KeyboardAvoidingView, Platform, ActivityIndicator 
} from 'react-native';
import { ScreenContainer } from '../components/screen-container';
import { useApp } from '../app-context';
import { useColors } from '../hooks/use-colors';
import { formatPrice } from '../formatting';
import { supabase } from '../supabase';

export default function AdminRentabilite() {
  const { state, actions } = useApp();
  const colors = useColors();
  
  // 1. ÉTATS DE SIMULATION BUSINESS (Remplace les 40 plats)
  const [caJournalier, setCaJournalier] = useState('100000'); // CA moyen espéré par jour
  const [ratioMatiere, setRatioMatiere] = useState('35'); // % du CA dédié aux achats ingrédients

  // 2. ÉTATS POUR LES CHARGES FIXES
  const [tempCharges, setTempCharges] = useState(state.chargesFixes || []);
  const [newName, setNewName] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Synchronisation avec les données globales
  useEffect(() => {
    if (state.chargesFixes && state.chargesFixes.length > 0) {
      setTempCharges(state.chargesFixes);
    }
  }, [state.chargesFixes]);

  const updateChargeLocally = (id: string, newMontant: string) => {
    setTempCharges(prev => prev.map(c => 
      c.id === id ? { ...c, montant: Number(newMontant) || 0 } : c
    ));
  };

  const addNewCharge = () => {
    if (!newName || !newAmount) {
      Alert.alert("Attention", "Veuillez remplir le nom et le montant.");
      return;
    }
    const newEntry = {
      id: `temp-${Date.now()}`,
      nom: newName,
      montant: Number(newAmount),
      periodicite: 'mensuel'
    };
    setTempCharges([...tempCharges, newEntry]);
    setNewName('');
    setNewAmount('');
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const chargesToSave = tempCharges.map(({ id, ...rest }) => ({
        nom: rest.nom,
        montant: rest.montant,
        periodicite: 'mensuel'
      }));

      // Nettoyage et insertion
      const { error: delError } = await supabase.from('charges_fixes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (delError) throw delError;

      const { error: insError } = await supabase.from('charges_fixes').insert(chargesToSave);
      if (insError) throw insError;

      if (actions?.refresh) await actions.refresh();
      Alert.alert("Succès", "La structure financière a été mise à jour.");
    } catch (error: any) {
      Alert.alert("Erreur", error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const calculs = useMemo(() => {
    const caMensuel = (Number(caJournalier) || 0) * 30;
    const totalFixeMensuel = tempCharges.reduce((acc, curr) => acc + Number(curr.montant), 0);
    
    // Coût des ingrédients sur le mois (Basé sur le ratio)
    const coutMatiereMensuel = caMensuel * (Number(ratioMatiere) / 100);
    
    // Bénéfice Net Mensuel
    const beneficeMensuel = caMensuel - coutMatiereMensuel - totalFixeMensuel;
    
    // Calcul du Point Mort (Seuil de rentabilité journalier)
    // Formule : Charges Fixes / Taux de Marge
    const tauxMarge = 1 - (Number(ratioMatiere) / 100);
    const pointMortJour = (totalFixeMensuel / 30) / (tauxMarge || 1);

    return {
      caMensuel,
      totalFixeMensuel,
      coutMatiereMensuel,
      beneficeMensuel,
      pointMortJour,
      pMatiere: Number(ratioMatiere),
      pStructure: (totalFixeMensuel / (caMensuel || 1)) * 100,
      pBenefice: (beneficeMensuel / (caMensuel || 1)) * 100
    };
  }, [caJournalier, ratioMatiere, tempCharges]);

  return (
    <ScreenContainer>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{flex: 1}}>
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Analyse Business</Text>

          {/* SIMULATEUR DE CA JOURNALIER */}
          <View style={[styles.simulationCard, { backgroundColor: colors.primary }]}>
            <Text style={styles.simLabel}>OBJECTIF DE VENTES / JOUR (CFA)</Text>
            <View style={styles.simInputRow}>
               <TouchableOpacity onPress={() => setCaJournalier(String(Math.max(0, Number(caJournalier) - 5000)))}>
                  <Text style={styles.simBtnText}>-</Text>
               </TouchableOpacity>
               <TextInput 
                  style={styles.simInput} 
                  keyboardType="numeric" 
                  value={caJournalier} 
                  onChangeText={setCaJournalier} 
                />
               <TouchableOpacity onPress={() => setCaJournalier(String(Number(caJournalier) + 5000))}>
                  <Text style={styles.simBtnText}>+</Text>
               </TouchableOpacity>
            </View>
            <Text style={styles.simSub}>Volume mensuel : {formatPrice(calculs.caMensuel)}</Text>
          </View>

          {/* INDICATEUR POINT MORT */}
          <View style={[styles.card, { backgroundColor: colors.surface, alignItems: 'center' }]}>
            <Text style={styles.cardTitle}>VOTRE SEUIL DE RENTABILITÉ JOURNALIER</Text>
            <Text style={[styles.pointMortValue, { color: colors.primary }]}>
              {formatPrice(calculs.pointMortJour)}
            </Text>
            <Text style={styles.legendText}>En dessous de ce montant encaissé par jour, vous travaillez à perte.</Text>
          </View>

          {/* GRAPHIQUE ANALYTIQUE */}
          <View style={[styles.chartCard, { backgroundColor: colors.surface }]}>
            <Text style={styles.cardTitle}>RÉPARTITION DU CHIFFRE D'AFFAIRES</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressSegment, { width: `${Math.max(0, calculs.pMatiere)}%`, backgroundColor: '#F87171' }]} />
              <View style={[styles.progressSegment, { width: `${Math.max(0, calculs.pStructure)}%`, backgroundColor: '#FBBF24' }]} />
              <View style={[styles.progressSegment, { width: `${Math.max(0, calculs.pBenefice)}%`, backgroundColor: '#34D399' }]} />
            </View>
            <View style={styles.legendRow}>
              <LegendItem color="#F87171" label="Achats Ingrédients" val={calculs.pMatiere} />
              <LegendItem color="#FBBF24" label="Charges Fixes" val={calculs.pStructure} />
              <LegendItem color="#34D399" label="Profit Net" val={calculs.pBenefice} />
            </View>
          </View>

          {/* RÉGLAGE DU RATIO MATIÈRE */}
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <Text style={styles.cardSubTitle}>📦 Coût Moyen des Ingrédients (%)</Text>
            <Text style={styles.label}>Pourcentage du prix de vente dédié aux achats (30-40% conseillé)</Text>
            <TextInput 
              style={[styles.input, { color: colors.foreground, fontSize: 20, fontWeight: '900' }]} 
              keyboardType="numeric" 
              value={ratioMatiere} 
              onChangeText={setRatioMatiere} 
            />
          </View>

          {/* GESTION DES CHARGES FIXES */}
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <Text style={styles.cardSubTitle}>🏢 Charges Fixes (Loyer, Staff...)</Text>
            
            <View style={styles.addForm}>
              <TextInput placeholder="Nom" style={[styles.addInput, { flex: 2 }]} value={newName} onChangeText={setNewName} />
              <TextInput placeholder="CFA" style={[styles.addInput, { flex: 1 }]} keyboardType="numeric" value={newAmount} onChangeText={setNewAmount} />
              <TouchableOpacity style={styles.addButton} onPress={addNewCharge}>
                <Text style={styles.addButtonText}>+</Text>
              </TouchableOpacity>
            </View>

            {tempCharges.map((charge) => (
              <View key={charge.id} style={styles.chargeRow}>
                <Text style={styles.chargeName}>{charge.nom}</Text>
                <TextInput 
                  style={[styles.chargeInput, { borderColor: colors.border, color: colors.foreground }]}
                  keyboardType="numeric"
                  value={charge.montant.toString()}
                  onChangeText={(val) => updateChargeLocally(charge.id, val)}
                />
              </View>
            ))}
          </View>

          {/* BILAN FINAL */}
          <View style={[styles.totalCard, { backgroundColor: calculs.beneficeMensuel > 0 ? '#34D399' : '#F87171' }]}>
            <Text style={styles.totalLabel}>PROFIT MENSUEL ESTIMÉ</Text>
            <Text style={styles.totalValue}>{formatPrice(calculs.beneficeMensuel)}</Text>
            <Text style={styles.totalSub}>Rentabilité sur CA : {calculs.pBenefice.toFixed(1)}%</Text>
          </View>

          <TouchableOpacity 
            style={[styles.saveBtn, { backgroundColor: colors.primary }]} 
            onPress={handleSave} 
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.saveBtnText}>ENREGISTRER LA CONFIGURATION</Text>
            )}
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

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 60 },
  headerTitle: { fontSize: 26, fontWeight: '900', marginBottom: 20 },
  simulationCard: { padding: 25, borderRadius: 25, marginBottom: 20, alignItems: 'center' },
  simLabel: { color: 'white', fontSize: 10, fontWeight: '900', marginBottom: 10, letterSpacing: 1 },
  simInputRow: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  simBtnText: { color: 'white', fontSize: 40, fontWeight: '300' },
  simInput: { color: 'white', fontSize: 34, fontWeight: '900', textAlign: 'center', minWidth: 160 },
  simSub: { color: 'white', marginTop: 10, opacity: 0.8, fontWeight: '600' },
  pointMortValue: { fontSize: 28, fontWeight: '900', marginVertical: 10 },
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
  input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 12, marginTop: 5 },
  label: { fontSize: 11, color: '#94a3b8', marginBottom: 4, fontWeight: '700' },
  chargeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  chargeName: { fontSize: 14, color: '#334155', fontWeight: '600', flex: 1 },
  chargeInput: { borderWidth: 1, borderRadius: 8, padding: 8, width: 100, textAlign: 'right' },
  totalCard: { borderRadius: 20, padding: 25, alignItems: 'center', marginBottom: 20 },
  totalLabel: { color: '#fff', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  totalValue: { color: '#fff', fontSize: 34, fontWeight: '900' },
  totalSub: { color: '#fff', fontSize: 14, fontWeight: '600', opacity: 0.9, marginTop: 5 },
  saveBtn: { padding: 18, borderRadius: 15, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '900' }
});