/**
 * RapportScreen - O'PIED DU MONT Mobile
 * Emplacement : /app/Rapportscreen.tsx
 * Version : 3.5 - Correction Syntaxique (Filtres)
 * Règle n°2 : Code complet fourni.
 */

import React, { useState, useEffect } from 'react';
import { 
  View, Text, ScrollView, StyleSheet, RefreshControl, 
  TouchableOpacity, Alert, Dimensions, Linking
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

interface ClientFidele {
  id: string;
  telephone: string;
  total_depense: number;
  nombre_visites: number;
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
  const marketingCount = state?.marketingCount || 0;

  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('semaine');
  const [rawTransactions, setRawTransactions] = useState<TransactionRow[]>([]);
  const [topClients, setTopClients] = useState<ClientFidele[]>([]);
  
  const [chartData, setChartData] = useState({
    labels: [""],
    datasets: [{ data: [0] }]
  });

  const [stats, setStats] = useState({
    caTheorique: 0,
    caReel: 0,
    depensesTotal: 0,
    beneficeNet: 0,
    ecartTotal: 0,
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

      const [txRes, expRes, cloRes, clientRes] = await Promise.all([
        supabase.from('transactions').select('id, creee_a, montant_total, mode_paiement').gte('creee_a', isoStart).order('creee_a', { ascending: true }),
        supabase.from('depenses').select('id, montant, creee_a').gte('creee_a', isoStart),
        supabase.from('clotures').select('total_physique, ecart, creee_a').gte('creee_a', isoStart),
        supabase.from('clients').select('id, telephone, total_depense, nombre_visites').order('total_depense', { ascending: false }).limit(10)
      ]);

      if (txRes.error) throw txRes.error;
      if (expRes.error) throw expRes.error;
      if (cloRes.error) throw cloRes.error;

      const allTx: TransactionRow[] = txRes.data || [];
      const allExp = expRes.data || [];
      const allClo = cloRes.data || [];
      setTopClients(clientRes.data || []);
      
      const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
      const last7DaysMap: Map<string, number> = new Map();
      
      for(let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        last7DaysMap.set(days[d.getDay()], 0);
      }

      let totalVentes = 0;
      let paiements: PaymentStats = { especes: 0, wave: 0, orange_money: 0, carte: 0 };

      allTx.forEach((t) => {
        const amount = Number(t.montant_total || 0);
        totalVentes += amount;
        const tDate = new Date(t.creee_a);
        const dayName = days[tDate.getDay()];
        if (last7DaysMap.has(dayName)) {
          last7DaysMap.set(dayName, (last7DaysMap.get(dayName) || 0) + amount);
        }
        const mode = (t.mode_paiement || 'especes').toLowerCase();
        if (mode.includes('wave')) paiements.wave += amount;
        else if (mode.includes('orange')) paiements.orange_money += amount;
        else if (mode.includes('carte')) paiements.carte += amount;
        else paiements.especes += amount;
      });

      setChartData({
        labels: Array.from(last7DaysMap.keys()),
        datasets: [{ data: Array.from(last7DaysMap.values()) }]
      });

      const totalDepenses = allExp.reduce((sum, e) => sum + Number(e.montant || 0), 0);
      const totalVerse = allClo.reduce((sum, c) => sum + Number(c.total_physique || 0), 0);
      const sumEcarts = allClo.reduce((sum, c) => sum + Number(c.ecart || 0), 0);

      setStats({
        caTheorique: totalVentes,
        caReel: totalVerse,
        depensesTotal: totalDepenses,
        beneficeNet: totalVerse - totalDepenses,
        ecartTotal: sumEcarts,
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

  const handleWhatsAppVIP = (phone: string) => {
    const message = `Bonjour ! C'est O'PIED DU MONT. 🏔️\n\nNous tenions à vous remercier pour votre fidélité. Vous faites partie de nos meilleurs clients ! \n\nAu plaisir de vous revoir très bientôt pour vous régaler. 👨‍🍳`;
    const url = `whatsapp://send?phone=${phone}&text=${encodeURIComponent(message)}`;
    
    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      } else {
        Alert.alert("Erreur", "WhatsApp n'est pas installé sur cet appareil.");
      }
    });
  };

  const handleMarketingAction = () => {
    Alert.alert(
      "Campagne Marketing",
      `Voulez-vous envoyer une relance WhatsApp aux ${marketingCount} clients inactifs depuis plus de 30 jours ?`,
      [
        { text: "Plus tard", style: "cancel" },
        { 
          text: "Lancer la relance", 
          onPress: () => Alert.alert("Succès", "La campagne a été lancée.") 
        }
      ]
    );
  };

  const exportToCSV = async () => {
    try {
      let csvContent = "ID;Date;Montant;Mode de Paiement\n";
      rawTransactions.forEach((t) => {
        csvContent += `${t.id};${new Date(t.creee_a).toLocaleString()};${t.montant_total};${t.mode_paiement}\n`;
      });
      const fileUri = FileSystem.cacheDirectory + `RAPPORT_${selectedPeriod.toUpperCase()}.csv`;
      await FileSystem.writeAsStringAsync(fileUri, csvContent);
      await Sharing.shareAsync(fileUri);
    } catch (error) {
      Alert.alert("Erreur Export", "L'exportation CSV a échoué.");
    }
  };

  useEffect(() => { 
    if (isAuthorized) fetchData(); 
  }, [isAuthorized, selectedPeriod]);

  if (!isAuthorized) {
    return (
      <ScreenContainer style={styles.center}>
        <Text style={styles.lockIcon}>🔒</Text>
        <Text style={{ color: colors.foreground, fontSize: 18, fontWeight: 'bold' }}>Accès Restreint</Text>
        <Text style={{ color: colors.muted, marginTop: 10, textAlign: 'center' }}>
          Réservé à l'administration de O'PIED DU MONT.
        </Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView 
        style={styles.container}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchData} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={[styles.title, { color: colors.foreground }]}>Rapports</Text>
            <Text style={[styles.dateSub, { color: colors.muted }]}>Analyse financière</Text>
          </View>
          <TouchableOpacity 
            style={[styles.exportBtn, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]} 
            onPress={exportToCSV}
          >
            <Text style={[styles.exportBtnText, { color: colors.foreground }]}>📥 CSV</Text>
          </TouchableOpacity>
        </View>

        {marketingCount > 0 && (
          <TouchableOpacity 
            style={[styles.marketingCard, { backgroundColor: '#F97316' }]} 
            onPress={handleMarketingAction}
            activeOpacity={0.9}
          >
            <View style={styles.marketingIcon}>
              <Text style={{ fontSize: 24 }}>📢</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 15 }}>
              <Text style={styles.marketingTitle}>{marketingCount} clients à relancer</Text>
              <Text style={styles.marketingSub}>Inactifs depuis plus de 30 jours</Text>
            </View>
            <View style={styles.marketingArrow}>
              <Text style={{ color: 'white', fontWeight: '900' }}>→</Text>
            </View>
          </TouchableOpacity>
        )}

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
              <Text style={{ color: selectedPeriod === p ? 'white' : colors.foreground, fontWeight: '800', fontSize: 10 }}>
                {p === 'jour' ? "AUJOURD'HUI" : p.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* CARTES DE RÉSUMÉ FINANCIER */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.summaryRow}>
            <View style={{ alignItems: 'center', flex: 1 }}>
              <Text style={styles.cardLabel}>CA THÉORIQUE</Text>
              <Text style={[styles.smallValue, { color: colors.foreground }]}>{formatPrice(stats.caTheorique)}</Text>
            </View>
            <View style={{ alignItems: 'center', flex: 1 }}>
              <Text style={styles.cardLabel}>CA RÉEL</Text>
              <Text style={[styles.smallValue, { color: colors.success }]}>{formatPrice(stats.caReel)}</Text>
            </View>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.summaryRow}>
             <View style={{ alignItems: 'center', flex: 1 }}>
              <Text style={styles.cardLabel}>DÉPENSES</Text>
              <Text style={[styles.smallValue, { color: colors.error }]}>-{formatPrice(stats.depensesTotal)}</Text>
            </View>
            <View style={{ alignItems: 'center', flex: 1 }}>
              <Text style={styles.cardLabel}>ÉCARTS CAISSE</Text>
              <Text style={[styles.smallValue, { color: stats.ecartTotal < 0 ? colors.error : colors.primary }]}>
                {formatPrice(stats.ecartTotal)}
              </Text>
            </View>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <Text style={[styles.cardLabel, { marginTop: 10 }]}>BÉNÉFICE NET ESTIMÉ</Text>
          <Text style={[styles.cardValue, { color: stats.beneficeNet >= 0 ? colors.success : colors.error }]}>
            {formatPrice(stats.beneficeNet)}
          </Text>
        </View>

        <View style={styles.chartWrapper}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Activité (Derniers jours)</Text>
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

        {/* DÉTAILS PAIEMENTS */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, marginBottom: 15 }]}>Détails Paiements</Text>
          {Object.entries(stats.parPaiement).map(([mode, montant]) => (
            <View key={mode} style={[styles.row, { borderBottomColor: colors.border }]}>
              <Text style={styles.label}>{mode.toUpperCase()}</Text>
              <Text style={[styles.val, { color: colors.foreground }]}>{formatPrice(montant)}</Text>
            </View>
          ))}
        </View>

        {/* CLASSEMENT VIP + ACTION WHATSAPP */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border, marginBottom: 40 }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, marginBottom: 5 }]}>Top 10 Clients Fidèles</Text>
          <Text style={[styles.dateSub, { color: colors.muted, marginBottom: 20 }]}>Remerciez vos meilleurs clients</Text>
          
          {topClients.map((client, index) => (
            <View key={client.id} style={[styles.row, { borderBottomColor: colors.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <Text style={[styles.rankText, { color: index < 3 ? colors.primary : colors.muted }]}>#{index + 1}</Text>
                <View style={{ marginLeft: 12 }}>
                  <Text style={[styles.val, { color: colors.foreground }]}>{client.telephone}</Text>
                  <Text style={{ fontSize: 10, color: colors.muted }}>{client.nombre_visites} visites • {formatPrice(client.total_depense)}</Text>
                </View>
              </View>
              
              <TouchableOpacity 
                style={[styles.waButton, { backgroundColor: '#25D366' }]} 
                onPress={() => handleWhatsAppVIP(client.telephone)}
              >
                <Text style={{ fontSize: 14 }}>💬</Text>
              </TouchableOpacity>
            </View>
          ))}
          {topClients.length === 0 && (
            <Text style={{ color: colors.muted, textAlign: 'center', marginVertical: 20 }}>Aucune donnée de fidélité.</Text>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
  lockIcon: { fontSize: 80, marginBottom: 20 },
  header: { marginTop: 10, marginBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 30, fontWeight: '900', letterSpacing: -1.5 },
  dateSub: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  exportBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  exportBtnText: { fontSize: 11, fontWeight: '900' },
  marketingCard: { 
    flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 20, marginBottom: 20,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 5, elevation: 6
  },
  marketingIcon: { width: 45, height: 45, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  marketingTitle: { color: 'white', fontSize: 16, fontWeight: '900' },
  marketingSub: { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: '600' },
  marketingArrow: { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  filterContainer: { flexDirection: 'row', gap: 8, marginBottom: 25 },
  filterBtn: { flex: 1, paddingVertical: 12, borderRadius: 14, alignItems: 'center', borderWidth: 1.5 },
  chartWrapper: { marginBottom: 30 },
  sectionTitle: { fontSize: 18, fontWeight: '900', letterSpacing: -0.5 },
  chart: { borderRadius: 24, marginTop: 15 },
  card: { padding: 25, borderRadius: 30, borderWidth: 1, alignItems: 'center', marginBottom: 25 },
  summaryRow: { flexDirection: 'row', width: '100%', marginVertical: 4 },
  divider: { height: 1, width: '90%', marginVertical: 12, opacity: 0.3 },
  cardLabel: { fontSize: 9, color: '#888', fontWeight: '900', letterSpacing: 1 },
  cardValue: { fontSize: 32, fontWeight: '900', marginVertical: 4 },
  smallValue: { fontSize: 16, fontWeight: '800', marginTop: 2 },
  section: { padding: 25, borderRadius: 30, borderWidth: 1, marginBottom: 25 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 15, borderBottomWidth: 1, alignItems: 'center' },
  label: { color: '#888', fontSize: 12, fontWeight: '800' },
  val: { fontWeight: '900', fontSize: 16 },
  rankText: { fontSize: 18, fontWeight: '900', width: 35 },
  waButton: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', elevation: 2 }
});