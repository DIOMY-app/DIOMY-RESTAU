/**
 * RapportScreen - O'PIED DU MONT Mobile
 * Emplacement : /app/Rapportscreen.tsx
 * Correction : Ajout du style lockIcon manquant et gestion du Bénéfice Net
 */

import React, { useState, useEffect } from 'react';
import { 
  View, Text, ScrollView, StyleSheet, RefreshControl, 
  TouchableOpacity, Alert, Dimensions, ActivityIndicator 
} from 'react-native';
import { LineChart } from "react-native-chart-kit";
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';

import { ScreenContainer } from '../components/screen-container';
import { useApp } from '../app-context';
import { useColors } from '../hooks/use-colors';
import { supabase } from '../supabase';
import { formatPrice } from '../formatting';

const screenWidth = Dimensions.get("window").width;

interface TransactionRow {
  id: string;
  creee_a: string;
  montant_total: number;
  mode_paiement: string;
}

interface DepenseRow {
  id: number;
  montant: number;
  creee_a: string;
}

interface TopClient {
  telephone: string;
  nom: string;
  nombre_visites: number;
  total_depense: number;
}

type PaymentStats = {
  especes: number;
  wave: number;
  orange_money: number;
  carte: number;
  [key: string]: number;
};

type Period = 'jour' | 'semaine' | 'mois';

export default function RapportScreen() {
  const colors = useColors();
  const { state } = useApp(); 
  const user = state?.user;

  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('semaine');
  const [rawTransactions, setRawTransactions] = useState<TransactionRow[]>([]);
  const [topClients, setTopClients] = useState<TopClient[]>([]);
  const [totalClientsCount, setTotalClientsCount] = useState(0);
  
  const [chartData, setChartData] = useState({
    labels: ["..."],
    datasets: [{ data: [0] }]
  });

  const [stats, setStats] = useState({
    caTotal: 0,
    depensesTotal: 0,
    beneficeNet: 0,
    nbVentes: 0,
    parPaiement: { especes: 0, wave: 0, orange_money: 0, carte: 0 } as PaymentStats,
  });

  const isAuthorized = user?.role === 'admin' || user?.role === 'manager';

  const fetchData = async () => {
    if (!isAuthorized) return;
    setLoading(true);
    
    try {
      const now = new Date();
      let startDate = new Date();

      if (selectedPeriod === 'jour') {
        startDate.setHours(0, 0, 0, 0);
      } else if (selectedPeriod === 'semaine') {
        startDate.setDate(now.getDate() - 7);
      } else {
        startDate.setMonth(now.getMonth() - 1);
      }

      const isoStart = startDate.toISOString();

      const { data: txData, error: txError } = await supabase
        .from('transactions') 
        .select('id, creee_a, montant_total, mode_paiement')
        .gte('creee_a', isoStart)
        .order('creee_a', { ascending: true });

      if (txError) throw txError;

      const { data: expData, error: expError } = await supabase
        .from('depenses')
        .select('id, montant, creee_a')
        .gte('creee_a', isoStart);

      if (expError) throw expError;
      
      const { data: clientsData } = await supabase.from('vue_fidelite_clients').select('*').limit(5);
      const { count } = await supabase.from('clients').select('*', { count: 'exact', head: true });

      setTopClients(clientsData || []);
      setTotalClientsCount(count || 0);

      const allTx: TransactionRow[] = txData || [];
      const allExp: DepenseRow[] = expData || [];
      
      const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
      const last7DaysMap: Map<string, number> = new Map();
      
      for(let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        last7DaysMap.set(days[d.getDay()], 0);
      }

      let totalRecettes = 0;
      let totalDepenses = 0;
      let paiements: PaymentStats = { especes: 0, wave: 0, orange_money: 0, carte: 0 };

      allTx.forEach((t) => {
        const amount = Number(t.montant_total);
        totalRecettes += amount;
        const tDate = new Date(t.creee_a);
        const dayName = days[tDate.getDay()];
        if (last7DaysMap.has(dayName)) {
          last7DaysMap.set(dayName, (last7DaysMap.get(dayName) || 0) + amount);
        }
        const mode = (t.mode_paiement || 'especes').toLowerCase();
        if (mode in paiements) paiements[mode] += amount;
        else paiements.especes += amount;
      });

      allExp.forEach((e) => {
        totalDepenses += Number(e.montant);
      });

      setChartData({
        labels: Array.from(last7DaysMap.keys()),
        datasets: [{ data: Array.from(last7DaysMap.values()) }]
      });

      setStats({
        caTotal: totalRecettes,
        depensesTotal: totalDepenses,
        beneficeNet: totalRecettes - totalDepenses,
        nbVentes: allTx.length,
        parPaiement: paiements,
      });

      setRawTransactions(allTx);
    } catch (err: any) {
      console.error("Erreur Rapport:", err);
      Alert.alert("Erreur", "Impossible de charger les rapports.");
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = async () => {
    try {
      let csvContent = "ID;Date;Montant;Mode\n";
      rawTransactions.forEach((t) => {
        csvContent += `${t.id};${new Date(t.creee_a).toLocaleString()};${t.montant_total};${t.mode_paiement}\n`;
      });
      const fileUri = FileSystem.cacheDirectory + `RAPPORT_${selectedPeriod.toUpperCase()}_${new Date().toISOString().split('T')[0]}.csv`;
      await FileSystem.writeAsStringAsync(fileUri, csvContent);
      await Sharing.shareAsync(fileUri);
    } catch (error) {
      Alert.alert("Erreur Export", "L'exportation a échoué.");
    }
  };

  useEffect(() => { 
    if (isAuthorized) fetchData(); 
  }, [isAuthorized, selectedPeriod]);

  if (!isAuthorized) {
    return (
      <ScreenContainer style={styles.center}>
        <Text style={styles.lockIcon}>🔒</Text>
        <Text style={{ color: colors.foreground, fontSize: 18, fontWeight: 'bold' }}>Accès Gérant Uniquement</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView 
        style={styles.container}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchData} tintColor={colors.primary} />}
      >
        <View style={styles.header}>
          <View>
            <Text style={[styles.title, { color: colors.foreground }]}>Performance</Text>
            <Text style={[styles.dateSub, { color: colors.muted }]}>{selectedPeriod.toUpperCase()}</Text>
          </View>
          <TouchableOpacity 
            style={[styles.exportBtn, { backgroundColor: colors.primary }]} 
            onPress={exportToExcel}
          >
            <Text style={styles.exportBtnText}>EXPORTER CSV</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.filterContainer}>
          {(['jour', 'semaine', 'mois'] as Period[]).map((p) => (
            <TouchableOpacity 
              key={p}
              onPress={() => setSelectedPeriod(p)}
              style={[
                styles.filterBtn, 
                { 
                  backgroundColor: selectedPeriod === p ? colors.primary : colors.surface,
                  borderColor: colors.border 
                }
              ]}
            >
              <Text style={{ color: selectedPeriod === p ? 'white' : colors.foreground, fontWeight: '800', fontSize: 11 }}>
                {p.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.summaryRow}>
            <View style={{ alignItems: 'center', flex: 1 }}>
              <Text style={styles.cardLabel}>RECETTES (CA)</Text>
              <Text style={[styles.smallValue, { color: colors.foreground }]}>{formatPrice(stats.caTotal)}</Text>
            </View>
            <View style={{ alignItems: 'center', flex: 1 }}>
              <Text style={styles.cardLabel}>DÉPENSES</Text>
              <Text style={[styles.smallValue, { color: colors.error }]}>-{formatPrice(stats.depensesTotal)}</Text>
            </View>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <Text style={[styles.cardLabel, { marginTop: 10 }]}>BÉNÉFICE NET ESTIMÉ</Text>
          <Text style={[styles.cardValue, { color: stats.beneficeNet >= 0 ? colors.success : colors.error }]}>
            {formatPrice(stats.beneficeNet)}
          </Text>
        </View>

        <View style={styles.chartWrapper}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Évolution CA (7j)</Text>
          <LineChart
            data={chartData}
            width={screenWidth - 32}
            height={180}
            chartConfig={{
              backgroundColor: colors.surface,
              backgroundGradientFrom: colors.surface,
              backgroundGradientTo: colors.surface,
              decimalPlaces: 0,
              color: (opacity = 1) => colors.primary,
              labelColor: (opacity = 1) => colors.muted,
              propsForDots: { r: "4", strokeWidth: "2", stroke: colors.primary }
            }}
            bezier
            style={styles.chart}
          />
        </View>

        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, marginBottom: 15 }]}>Encaissements par mode</Text>
          {Object.entries(stats.parPaiement).map(([mode, montant]) => (
            <View key={mode} style={[styles.row, { borderBottomColor: colors.border }]}>
              <Text style={styles.label}>{mode.toUpperCase()}</Text>
              <Text style={[styles.val, { color: colors.foreground }]}>{formatPrice(montant)}</Text>
            </View>
          ))}
        </View>

        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, marginBottom: 15 }]}>🏆 Fidélité Client</Text>
          {topClients.map((item) => (
            <View key={item.telephone} style={[styles.row, { borderBottomColor: colors.border }]}>
              <View>
                <Text style={[styles.val, { color: colors.foreground }]}>{item.nom || 'Client'}</Text>
                <Text style={{ fontSize: 11, color: colors.muted }}>{item.telephone}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.val, { color: colors.primary }]}>{formatPrice(item.total_depense)}</Text>
                <Text style={{ fontSize: 11, color: colors.muted }}>{item.nombre_visites} visites</Text>
              </View>
            </View>
          ))}
        </View>
        <View style={{ height: 50 }} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  lockIcon: { fontSize: 60, marginBottom: 20 }, // <-- AJOUTÉ ICI
  header: { marginTop: 10, marginBottom: 25, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 28, fontWeight: '900', letterSpacing: -1 },
  dateSub: { fontSize: 13, fontWeight: '600' },
  exportBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  exportBtnText: { color: 'white', fontSize: 10, fontWeight: '900' },
  filterContainer: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  filterBtn: { flex: 1, paddingVertical: 12, borderRadius: 15, alignItems: 'center', borderWidth: 1 },
  chartWrapper: { marginBottom: 30 },
  sectionTitle: { fontSize: 17, fontWeight: '800' },
  chart: { borderRadius: 20, marginTop: 15, paddingRight: 40 },
  card: { padding: 20, borderRadius: 24, borderWidth: 1, alignItems: 'center', marginBottom: 25 },
  summaryRow: { flexDirection: 'row', width: '100%', marginBottom: 10 },
  divider: { height: 1, width: '80%', marginVertical: 5 },
  cardLabel: { fontSize: 9, color: '#888', fontWeight: '900', letterSpacing: 1 },
  cardValue: { fontSize: 28, fontWeight: '900', marginVertical: 5 },
  smallValue: { fontSize: 16, fontWeight: '800' },
  section: { padding: 20, borderRadius: 24, borderWidth: 1, marginBottom: 20 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1 },
  label: { color: '#888', fontSize: 11, fontWeight: '800' },
  val: { fontWeight: '900', fontSize: 14 }
});