/**
 * RapportScreen - O'PIED DU MONT Mobile
 * Emplacement : /app/Rapportscreen.tsx
 * Gestion comptable et performance - Version stabilisée
 */

import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity, Alert, Dimensions, ActivityIndicator } from 'react-native';
import { LineChart } from "react-native-chart-kit";
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';

import { ScreenContainer } from '../components/screen-container';
import { useApp } from '../app-context';
import { useColors } from '../hooks/use-colors';
import { supabase } from '../supabase';
import { formatPrice } from '../formatting';

const screenWidth = Dimensions.get("window").width;

// Interface locale pour les commandes récupérées de Supabase
interface OrderRow {
  id: string;
  created_at: string;
  total: number;
  payment_method: string;
  caissier_nom?: string;
}

export default function RapportScreen() {
  const colors = useColors();
  const { state } = useApp(); 
  const user = state?.user;

  const [loading, setLoading] = useState(true);
  const [rawOrders, setRawOrders] = useState<OrderRow[]>([]);
  const [totalClients, setTotalClients] = useState(0);
  const [chartData, setChartData] = useState<{labels: string[], datasets: {data: number[]}[]}>({
    labels: ["..."],
    datasets: [{ data: [0] }]
  });

  const [stats, setStats] = useState({
    caTotal: 0,
    nbVentes: 0,
    parPaiement: { especes: 0, wave: 0, orange: 0, moov: 0, carte: 0 },
  });

  // Vérification stricte des permissions (Manager ou Admin)
  const isAuthorized = user?.role === 'admin' || user?.role === 'manager';

  const fetchData = async () => {
    if (!isAuthorized) return;
    setLoading(true);
    
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
      sevenDaysAgo.setHours(0,0,0,0);

      // 1. Récupération des commandes des 7 derniers jours
      const { data: orders, error: txError } = await supabase
        .from('commandes')
        .select('*')
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: true });

      if (txError) throw txError;
      
      // 2. Récupération du nombre total de clients enregistrés
      const { count, error: countError } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true });

      if (countError) throw countError;
      setTotalClients(count || 0);

      const allOrders: OrderRow[] = orders || [];
      
      // Filtrage pour les stats du jour
      setRawOrders(allOrders.filter((t: OrderRow) => new Date(t.created_at) >= today));

      // 3. Préparation des données du graphique
      const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
      const last7DaysMap: { [key: string]: number } = {};
      
      for(let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        last7DaysMap[days[d.getDay()]] = 0;
      }

      let totalJour = 0;
      let paiements = { especes: 0, wave: 0, orange: 0, moov: 0, carte: 0 };

      allOrders.forEach((t: OrderRow) => {
        const tDate = new Date(t.created_at);
        const dayName = days[tDate.getDay()];
        
        // Ajout au graphique si dans les 7 jours
        if (last7DaysMap[dayName] !== undefined) {
          last7DaysMap[dayName] += t.total;
        }

        // Stats spécifiques à aujourd'hui
        if (tDate >= today) {
          totalJour += t.total;
          const mode = (t.payment_method || 'especes').toLowerCase();
          if (mode in paiements) {
            (paiements as any)[mode] += t.total;
          }
        }
      });

      setChartData({
        labels: Object.keys(last7DaysMap),
        datasets: [{ data: Object.values(last7DaysMap) }]
      });

      setStats({
        caTotal: totalJour,
        nbVentes: allOrders.filter((t: OrderRow) => new Date(t.created_at) >= today).length,
        parPaiement: paiements,
      });

    } catch (err) {
      console.error("Erreur Rapport:", err);
      Alert.alert("Erreur de synchronisation", "Impossible de récupérer les données comptables.");
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = async () => {
    try {
      let csvContent = "ID;Date;Montant;Mode de Paiement\n";
      rawOrders.forEach((t: OrderRow) => {
        const d = new Date(t.created_at);
        csvContent += `${t.id};${d.toLocaleDateString()};${t.total};${t.payment_method}\n`;
      });

      const fileUri = FileSystem.cacheDirectory + `RAPPORT_VENTES_${new Date().toISOString().split('T')[0]}.csv`;
      await FileSystem.writeAsStringAsync(fileUri, csvContent);
      await Sharing.shareAsync(fileUri);
    } catch (error) {
      Alert.alert("Erreur Export", "L'exportation du fichier CSV a échoué.");
    }
  };

  useEffect(() => { 
    if (isAuthorized) fetchData(); 
  }, [isAuthorized]);

  if (!isAuthorized) {
    return (
      <ScreenContainer style={styles.center}>
        <Text style={styles.lockIcon}>🔒</Text>
        <Text style={{ color: colors.foreground, fontSize: 18, fontWeight: 'bold' }}>Accès Restreint</Text>
        <Text style={{ color: colors.muted, textAlign: 'center', marginTop: 10 }}>
          Vous n'avez pas les permissions nécessaires pour voir les rapports financiers.
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
            <Text style={[styles.dateSub, { color: colors.muted }]}>O'PIED DU MONT - Activité</Text>
          </View>
          <TouchableOpacity 
            style={[styles.exportBtn, { backgroundColor: colors.primary }]} 
            onPress={exportToExcel}
          >
            <Text style={styles.exportBtnText}>CSV</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.chartWrapper}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Évolution CA (7j)</Text>
          <LineChart
            data={chartData}
            width={screenWidth - 32}
            height={200}
            chartConfig={{
              backgroundColor: colors.surface,
              backgroundGradientFrom: colors.surface,
              backgroundGradientTo: colors.surface,
              decimalPlaces: 0,
              color: (opacity = 1) => colors.primary,
              labelColor: (opacity = 1) => colors.muted,
              style: { borderRadius: 16 },
              propsForDots: { r: "5", strokeWidth: "2", stroke: colors.primary }
            }}
            bezier
            style={{ borderRadius: 16, marginTop: 15, elevation: 2 }}
          />
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={styles.cardLabel}>CHIFFRE D'AFFAIRES DU JOUR</Text>
          <Text style={[styles.cardValue, { color: colors.primary }]}>{formatPrice(stats.caTotal)}</Text>
          <View style={styles.badgeRow}>
             <Text style={[styles.subValue, { backgroundColor: colors.background, color: colors.foreground }]}>
               {stats.nbVentes} commandes
             </Text>
             <Text style={[styles.subValue, { backgroundColor: colors.background, color: colors.foreground }]}>
               {totalClients} clients total
             </Text>
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, marginBottom: 10 }]}>Détails par Paiement</Text>
          {Object.entries(stats.parPaiement).map(([mode, montant]) => (
            <View key={mode} style={[styles.row, { borderBottomColor: colors.border }]}>
              <Text style={styles.label}>{mode.toUpperCase()}</Text>
              <Text style={[styles.val, { color: colors.foreground }]}>{formatPrice(montant)}</Text>
            </View>
          ))}
        </View>
        
        <View style={{ height: 40 }} />
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
  exportBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 14, elevation: 3 },
  exportBtnText: { color: 'white', fontSize: 13, fontWeight: '900' },
  chartWrapper: { marginBottom: 30 },
  sectionTitle: { fontSize: 18, fontWeight: '800' },
  card: { padding: 25, borderRadius: 24, borderWidth: 1, alignItems: 'center', marginBottom: 25, elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10 },
  cardLabel: { fontSize: 11, color: '#64748b', fontWeight: '900', letterSpacing: 1 },
  cardValue: { fontSize: 34, fontWeight: '900', marginVertical: 10 },
  badgeRow: { flexDirection: 'row', gap: 10, marginTop: 5 },
  subValue: { fontSize: 12, fontWeight: '700', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8, overflow: 'hidden' },
  section: { padding: 20, borderRadius: 24, borderWidth: 1, marginBottom: 20 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 18, borderBottomWidth: 1 },
  label: { color: '#64748b', fontSize: 13, fontWeight: '800' },
  val: { fontWeight: '900', fontSize: 16 }
});