/**
 * RapportScreen - O'PIED DU MONT Mobile
 * Gestion comptable et performance - Correction erreurs 7006
 */

import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity, Alert, Dimensions, ActivityIndicator } from 'react-native';
import { LineChart } from "react-native-chart-kit";
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';

// @ts-ignore
import { ScreenContainer } from '../components/screen-container';
// @ts-ignore
import { useApp } from '../lib/app-context';
// @ts-ignore
import { useColors } from '../hooks/use-colors';
// @ts-ignore
import { supabase } from '../supabase';
// @ts-ignore
import { formatPrice } from '../lib/formatting';

const screenWidth = Dimensions.get("window").width;

// Définition de l'interface pour corriger les erreurs 7006 (Parameter 't' has any type)
interface Order {
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
  const [rawOrders, setRawOrders] = useState<Order[]>([]);
  const [totalClients, setTotalClients] = useState(0);
  const [chartData, setChartData] = useState<{labels: string[], datasets: {data: number[]}[]}>({
    labels: ["..."],
    datasets: [{ data: [0] }]
  });

  const [stats, setStats] = useState({
    caTotal: 0,
    nbVentes: 0,
    parPaiement: { especes: 0, wave: 0, orange: 0, moov: 0, carte: 0 } as any,
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
      sevenDaysAgo.setHours(0,0,0,0);

      const { data: orders, error: txError } = await supabase
        .from('commandes')
        .select('*')
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: true });

      if (txError) throw txError;
      
      const { count, error: countError } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true });

      if (countError) throw countError;
      setTotalClients(count || 0);

      const allOrders: Order[] = orders || [];
      
      // Correction Erreur 1 (Ligne 77) : Typage explicite (t: Order)
      setRawOrders(allOrders.filter((t: Order) => new Date(t.created_at) >= today));

      const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
      const last7DaysMap: { [key: string]: number } = {};
      
      for(let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        last7DaysMap[days[d.getDay()]] = 0;
      }

      let totalJour = 0;
      let paiements = { especes: 0, wave: 0, orange: 0, moov: 0, carte: 0 };

      // Correction Erreur 2 (Ligne 92) : Typage explicite (t: Order)
      allOrders.forEach((t: Order) => {
        const tDate = new Date(t.created_at);
        const dayName = days[tDate.getDay()];
        
        if (last7DaysMap[dayName] !== undefined) {
          last7DaysMap[dayName] += t.total;
        }

        if (tDate >= today) {
          totalJour += t.total;
          const mode = (t.payment_method || 'especes').toLowerCase();
          if (mode in paiements) (paiements as any)[mode] += t.total;
        }
      });

      setChartData({
        labels: Object.keys(last7DaysMap),
        datasets: [{ data: Object.values(last7DaysMap) }]
      });

      setStats({
        caTotal: totalJour,
        // Correction Erreur 3 (Ligne 114) : Typage explicite (t: Order)
        nbVentes: allOrders.filter((t: Order) => new Date(t.created_at) >= today).length,
        parPaiement: paiements,
      });

    } catch (err) {
      console.error("Erreur Rapport:", err);
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = async () => {
    try {
      let csvContent = "ID;Date;Montant;Paiement\n";
      rawOrders.forEach((t: Order) => {
        const d = new Date(t.created_at);
        csvContent += `${t.id};${d.toLocaleDateString()};${t.total};${t.payment_method}\n`;
      });

      const fileUri = FileSystem.cacheDirectory + `OPIED_RAPPORT.csv`;
      await FileSystem.writeAsStringAsync(fileUri, csvContent);
      await Sharing.shareAsync(fileUri);
    } catch (error) {
      Alert.alert("Erreur", "L'export a échoué.");
    }
  };

  useEffect(() => { 
    if (isAuthorized) fetchData(); 
  }, [isAuthorized]);

  if (!isAuthorized) {
    return (
      <ScreenContainer style={styles.center}>
        <Text style={styles.lockIcon}>🔒</Text>
        <Text style={{ color: colors.muted, textAlign: 'center' }}>Accès réservé.</Text>
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
            <Text style={styles.dateSub}>O'PIED DU MONT</Text>
          </View>
          <TouchableOpacity 
            style={[styles.exportBtn, { backgroundColor: colors.primary }]} 
            onPress={exportToExcel}
          >
            <Text style={styles.exportBtnText}>EXPORT</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.chartWrapper}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>CA (7 jours)</Text>
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
            style={{ borderRadius: 16, marginTop: 10 }}
          />
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={styles.cardLabel}>CA DU JOUR</Text>
          <Text style={[styles.cardValue, { color: colors.primary }]}>{formatPrice(stats.caTotal)}</Text>
          <Text style={styles.subValue}>{stats.nbVentes} commandes</Text>
        </View>

        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Modes de paiement</Text>
          {Object.entries(stats.parPaiement).map(([mode, montant]: any) => (
            <View key={mode} style={styles.row}>
              <Text style={styles.label}>{mode.toUpperCase()}</Text>
              <Text style={[styles.val, { color: colors.foreground }]}>{formatPrice(montant)}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  lockIcon: { fontSize: 50, marginBottom: 20 },
  header: { marginTop: 10, marginBottom: 25, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 28, fontWeight: 'bold' },
  dateSub: { color: '#94a3b8', fontSize: 14 },
  exportBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  exportBtnText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
  chartWrapper: { marginBottom: 25 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold' },
  card: { padding: 25, borderRadius: 20, borderWidth: 1, alignItems: 'center', marginBottom: 20 },
  cardLabel: { fontSize: 11, color: '#64748b', fontWeight: 'bold' },
  cardValue: { fontSize: 32, fontWeight: '900', marginVertical: 8 },
  subValue: { fontSize: 13, color: '#94a3b8' },
  section: { padding: 20, borderRadius: 20, borderWidth: 1 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  label: { color: '#64748b', fontSize: 13, fontWeight: '600' },
  val: { fontWeight: 'bold', fontSize: 15 }
});