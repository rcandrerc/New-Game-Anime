plugins { id("com.android.application"); id("org.jetbrains.kotlin.android") }
android {
    namespace = "br.rcandrerc.aventura"
    compileSdk = 34
    defaultConfig { applicationId = "br.rcandrerc.aventura"; minSdk = 26; targetSdk = 34; versionCode = 1; versionName = "0.1-teste" }
    buildTypes { getByName("release") { isMinifyEnabled = false; signingConfig = signingConfigs.getByName("debug") } }
    compileOptions { sourceCompatibility = JavaVersion.VERSION_17; targetCompatibility = JavaVersion.VERSION_17 }
    kotlinOptions { jvmTarget = "17" }
}
