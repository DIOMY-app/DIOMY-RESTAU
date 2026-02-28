/**
 * RapportScreen - O'PIED DU MONT Mobile
 * Emplacement : /app/Rapportscreen.tsx
 * Version finale : Synchronisée avec la table 'ventes' et sécurisée
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

// Interface alignée sur le schéma réel de la base de données
interface OrderRow {
  id: string;
  created_at: string;
  total: number;
  payment_method: string;
}

type PaymentStats = {
  especes: number;
  wave: number;
  orange: number;
  moov: number;
  carte: number;
  [key: string]: number; // Permet l'indexation dynamique
};

export default function RapportScreen() {
  const colors = useColors();
  const { state } = useApp(); 
  const user = state?.user;

  const [loading, setLoading] = useState(true);
  const [rawOrders, setRawOrders] = useState<OrderRow[]>([]);
  const [totalClients, setTotalClients] = useState(0);
  const [chartData, setChartData] = useState({
    labels: ["..."],
    datasets: [{ data: [0] }]
  });

  const [stats, setStats] = useState({
    caTotal: 0,
    nbVentes: 0,
    parPaiement: { especes: 0, wave: 0, orange: 0, moov: 0, carte: 0 } as PaymentStats,
  });

  const isAuthorized = user?.role === 'admin' || user?.role === 'manager';

  const fetchData = async () => {
    if (!isAuthorized) return;
    setLoading(true);
    
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
      sevenDaysAgo.setHours(0, 0, 0, 0);

      // 1. Récupération des ventes (nom de table harmonisé : 'ventes')
      const { data: orders, error: txError } = await supabase
        .from('ventes') 
        .select('id, created_at, total, payment_method')
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: true });

      if (txError) throw txError;
      
      // 2. Récupération du nombre de clients
      const { count, error: countError } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true });

      if (countError) throw countError;
      setTotalClients(count || 0);

      const allOrders: OrderRow[] = orders || [];
      const dayOrders = allOrders.filter(t => new Date(t.created_at) >= today);
      setRawOrders(dayOrders);

      // 3. Logique du Graphique
      const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
      const last7DaysMap: Map<string, number> = new Map();
      
      for(let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        last7DaysMap.set(days[d.getDay()], 0);
      }

      let totalJour = 0;
      let paiements: PaymentStats = { especes: 0, wave: 0, orange: 0, moov: 0, carte: 0 };

      allOrders.forEach((t) => {
        const tDate = new Date(t.created_at);
        const dayName = days[tDate.getDay()];
        
        if (last7DaysMap.has(dayName)) {
          last7DaysMap.set(dayName, (last7DaysMap.get(dayName) || 0) + t.total);
        }

        if (tDate >= today) {
          totalJour += t.total;
          const mode = (t.payment_method || 'especes').toLowerCase();
          // Normalisation des noms de paiement (ex: orange_money -> orange)
          const cleanMode = mode.includes('orange') ? 'orange' : mode;
          if (cleanMode in paiements) {
            paiements[cleanMode] += t.total;
          } else {
            paiements.especes += t.total; // Fallback
          }
        }
      });

      setChartData({
        labels: Array.from(last7DaysMap.keys()),
        datasets: [{ data: Array.from(last7DaysMap.values()) }]
      });

      setStats({
        caTotal: totalJour,
        nbVentes: dayOrders.length,
        parPaiement: paiements,
      });

    } catch (err: any) {
      console.error("Erreur Rapport:", err);
      Alert.alert("Erreur de synchronisation", "Impossible de charger les rapports.");
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = async () => {
    try {
      let csvContent = "ID;Date;Montant;Mode de Paiement\n";
      rawOrders.forEach((t) => {
        const d = new Date(t.created_at);
        csvContent += `${t.id};${d.toLocaleString()};${t.total};${t.payment_method}\n`;
      });

      const fileUri = FileSystem.cacheDirectory + `RAPPORT_${new Date().toISOString().split('T')[0]}.csv`;
      await FileSystem.writeAsStringAsync(fileUri, csvContent);
      await Sharing.shareAsync(fileUri);
    } catch (error) {
      Alert.alert("Erreur Export", "L'exportation a échoué.");
    }
  };

  useEffect(() => { 
    if (isAuthorized) fetchData(); 
  }, [isAuthorized]);

  if (!isAuthorized) {
    return (
      <ScreenContainer style={styles.center}>
        <Text style={styles.lockIcon}>🔒</Text>
        <Text style={{ color: colors.foreground, fontSize: 18, fontWeight: 'bold' }}>Accès Réservé</Text>
        <Text style={{ color: colors.muted, textAlign: 'center', marginTop: 10 }}>
          Seuls les Administrateurs et Managers peuvent consulter les données financières.
        </Text>
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
            <Text style={[styles.title, { color: colors.foreground }]}>Rapports</Text>
            <Text style={[styles.dateSub, { color: colors.muted }]}>Activité O'PIED DU MONT</Text>
          </View>
          <TouchableOpacity 
            style={[styles.exportBtn, { backgroundColor: colors.primary }]} 
            onPress={exportToExcel}
          >
            <Text style={styles.exportBtnText}>EXPORTER</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.chartWrapper}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Chiffre d'Affaires (7 derniers jours)</Text>
          <LineChart
            data={chartData}
            width={screenWidth - 32}
            height={220}
            chartConfig={{
              backgroundColor: colors.surface,
              backgroundGradientFrom: colors.surface,
              backgroundGradientTo: colors.surface,
              decimalPlaces: 0,
              color: (opacity = 1) => colors.primary,
              labelColor: (opacity = 1) => colors.muted,
              propsForDots: { r: "6", strokeWidth: "2", stroke: colors.primary }
            }}
            bezier
            style={styles.chart}
          />
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={styles.cardLabel}>CHIFFRE D'AFFAIRES AUJOURD'HUI</Text>
          <Text style={[styles.cardValue, { color: colors.primary }]}>{formatPrice(stats.caTotal)}</Text>
          <View style={styles.badgeRow}>
              <View style={[styles.badge, { backgroundColor: colors.background }]}>
                <Text style={[styles.badgeText, { color: colors.foreground }]}>{stats.nbVentes} Ventes</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: colors.background }]}>
                <Text style={[styles.badgeText, { color: colors.foreground }]}>{totalClients} Clients</Text>
              </View>
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, marginBottom: 15 }]}>Répartition des Encaissements</Text>
          {Object.entries(stats.parPaiement).map(([mode, montant]) => (
            <View key={mode} style={[styles.row, { borderBottomColor: colors.border }]}>
              <Text style={styles.label}>{mode.toUpperCase()}</Text>
              <Text style={[styles.val, { color: colors.foreground }]}>{formatPrice(montant)}</Text>
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
  lockIcon: { fontSize: 60, marginBottom: 20 },
  header: { marginTop: 10, marginBottom: 25, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 32, fontWeight: '900', letterSpacing: -1 },
  dateSub: { fontSize: 14, fontWeight: '600' },
  exportBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  exportBtnText: { color: 'white', fontSize: 12, fontWeight: '900' },
  chartWrapper: { marginBottom: 30 },
  sectionTitle: { fontSize: 18, fontWeight: '800' },
  chart: { borderRadius: 24, marginTop: 15, elevation: 4, paddingRight: 40 },
  card: { padding: 25, borderRadius: 24, borderWidth: 1, alignItems: 'center', marginBottom: 25, elevation: 2 },
  cardLabel: { fontSize: 11, color: '#64748b', fontWeight: '900', letterSpacing: 1 },
  cardValue: { fontSize: 36, fontWeight: '900', marginVertical: 8 },
  badgeRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  section: { padding: 20, borderRadius: 24, borderWidth: 1, marginBottom: 20 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 15, borderBottomWidth: 1 },
  label: { color: '#64748b', fontSize: 13, fontWeight: '800' },
  val: { fontWeight: '900', fontSize: 16 }
});