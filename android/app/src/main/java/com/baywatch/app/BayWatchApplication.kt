package com.baywatch.app

import android.app.Application
import com.baywatch.app.data.ServiceLocator

class BayWatchApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        ServiceLocator.init(this)
    }
}
