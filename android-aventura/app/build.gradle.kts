plugins { id("com.android.application"); id("org.jetbrains.kotlin.android") }
android {
    namespace = "br.rcandrerc.aventura"
    compileSdk = 34
    defaultConfig { applicationId = "br.rcandrerc.aventura"; minSdk = 26; targetSdk = 34; versionCode = 7; versionName = "0.7" }
    buildTypes { getByName("release") { isMinifyEnabled = false; signingConfig = signingConfigs.getByName("debug") } }
    compileOptions { sourceCompatibility = JavaVersion.VERSION_17; targetCompatibility = JavaVersion.VERSION_17 }
    kotlinOptions { jvmTarget = "17" }
    buildFeatures { buildConfig = true }
}

android { testOptions { unitTests { isIncludeAndroidResources = true } } }
dependencies {
    implementation("androidx.core:core:1.13.1")
    implementation("androidx.credentials:credentials:1.3.0")
    implementation("androidx.credentials:credentials-play-services-auth:1.3.0")
    implementation("com.google.android.libraries.identity.googleid:googleid:1.1.1")
    testImplementation("junit:junit:4.13.2")
    testImplementation("org.robolectric:robolectric:4.13")
}
