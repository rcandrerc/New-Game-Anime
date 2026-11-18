plugins { id("com.android.application"); id("org.jetbrains.kotlin.android") }
android {
    namespace = "br.rcandrerc.aventura"
    compileSdk = 34
    defaultConfig { applicationId = "br.rcandrerc.aventura"; minSdk = 26; targetSdk = 34; versionCode = 4; versionName = "0.4-teste" }
    buildTypes { getByName("release") { isMinifyEnabled = false; signingConfig = signingConfigs.getByName("debug") } }
    compileOptions { sourceCompatibility = JavaVersion.VERSION_17; targetCompatibility = JavaVersion.VERSION_17 }
    kotlinOptions { jvmTarget = "17" }
    buildFeatures { buildConfig = true }
}

android { testOptions { unitTests { isIncludeAndroidResources = true } } }
dependencies {
    testImplementation("junit:junit:4.13.2")
    testImplementation("org.robolectric:robolectric:4.13")
}
