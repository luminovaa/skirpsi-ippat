import { useTheme } from "@/hooks/use-theme";
import { StyleSheet, Text, TouchableOpacity, View, ScrollView, Image } from "react-native";
import { Feather } from "@expo/vector-icons";

export default function SettingScreen() {
  const { colors, toggleTheme, theme } = useTheme();
  
  const teamMembers = [
    { id: 1, name: "Arfa Erdianto S", role: "Mobile Dev", avatar: require("@/assets/images/icon.png") },
    { id: 2, name: "M Iffat Firdaus", role: "IOT Engineer", avatar: require("@/assets/images/icon.png") },
    { id: 3, name: "M Zidan Ainur R", role: "FullStack Developer", avatar: require("@/assets/images/icon.png") },
  ];

  const renderSettingItem = (icon: string, title: string, action: () => void, showToggle: boolean = false) => (
    <TouchableOpacity 
      style={[styles.settingItem, { borderBottomColor: colors.border }]} 
      onPress={action}
    >
      <View style={styles.settingIconTitle}>
        {/* <Feather name={icon} size={22} color={colors.primary} style={styles.settingIcon} /> */}
        <Text style={[styles.settingTitle, { color: colors.text }]}>{title}</Text>
      </View>
      
      {showToggle ? (
        <View style={[styles.themeIndicator, { backgroundColor: theme === 'dark' ? colors.border : colors.border }]}>
          <View style={[
            styles.themeIndicatorKnob, 
            { 
              backgroundColor: colors.primary,
              transform: [{ translateX: theme === 'dark' ? 20 : 0 }] 
            }
          ]} />
        </View>
      ) : (
        <Feather name="chevron-right" size={22} color={colors.textSecondary} />
      )}
    </TouchableOpacity>
  );

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
    >
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Pengaturan</Text>
      </View>
      
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Tampilan</Text>
        {renderSettingItem("moon", `Tema ${theme === 'dark' ? 'Gelap' : 'Terang'}`, toggleTheme, true)}
      </View>
      
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Tentang Aplikasi</Text>
        {renderSettingItem("info", "Versi Aplikasi", () => {}, false)}
        {renderSettingItem("shield", "Kebijakan Privasi", () => {}, false)}
        {renderSettingItem("file-text", "Syarat dan Ketentuan", () => {}, false)}
      </View>
      
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Tim Pengembang</Text>
        <View style={styles.teamContainer}>
          {teamMembers.map(member => (
            <View key={member.id} style={[styles.teamMember, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Image source={member.avatar} style={styles.avatar} />
              <Text style={[styles.memberName, { color: colors.text }]}>{member.name}</Text>
              <Text style={[styles.memberRole, { color: colors.textSecondary }]}>{member.role}</Text>
            </View>
          ))}
        </View>
      </View>
      
      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: colors.textSecondary }]}>
          © 2025 Develop By Neon Code v1.0.2
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 20,
  },
  contentContainer: {
    paddingBottom: 30,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    marginHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '500',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    textTransform: 'uppercase',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  settingIconTitle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingIcon: {
    marginRight: 12,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  themeIndicator: {
    width: 50,
    height: 30,
    borderRadius: 15,
    padding: 4,
  },
  themeIndicatorKnob: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  teamContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    padding: 16,
  },
  teamMember: {
    alignItems: 'center',
    width: '30%',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 10,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 8,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  memberRole: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 2,
  },
  footer: {
    alignItems: 'center',
    marginTop: 20,
  },
  footerText: {
    fontSize: 12,
  }
});