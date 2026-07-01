package com.flatwise.app.data

import android.content.Context
import com.flatwise.app.splitwise.SplitwiseAuthRepository

object AppContainer {
    lateinit var repository: TransactionRepository
        private set
    lateinit var splitwiseAuthRepository: SplitwiseAuthRepository
        private set

    fun init(context: Context) {
        val appContext = context.applicationContext
        repository = TransactionRepository(appContext)
        splitwiseAuthRepository = SplitwiseAuthRepository(appContext)
    }
}
