import os
import joblib
import numpy as np
import pandas as pd
from django.core.management.base import BaseCommand
from django.conf import settings
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression, LinearRegression
from sklearn.preprocessing import StandardScaler

class Command(BaseCommand):
    help = 'Generates synthetic dataset and trains the AI models for Approval Probability and Future Cost prediction'

    def handle(self, *args, **kwargs):
        self.stdout.write("Generating synthetic datasets...")
        
        # Ensure model directory exists
        model_dir = os.path.join(settings.BASE_DIR, 'tours', 'ml_models')
        os.makedirs(model_dir, exist_ok=True)
        
        # 1. Train Approval Probability Model (Classification)
        # Features: total_cost, budget_tier_code, has_flight, has_hotel, has_restaurant, has_ride, user_approval_rate
        np.random.seed(42)
        n_samples = 1000
        
        total_cost = np.random.uniform(200, 10000, n_samples)
        budget_tier_code = np.random.choice([0, 1, 2], n_samples) # 0=BUDGET, 1=STANDARD, 2=LUXURY
        has_flight = np.random.choice([0, 1], n_samples)
        has_hotel = np.random.choice([0, 1], n_samples)
        has_restaurant = np.random.choice([0, 1], n_samples)
        has_ride = np.random.choice([0, 1], n_samples)
        user_approval_rate = np.random.uniform(0.1, 1.0, n_samples)
        
        # Generate target: Approval probability is lower for high costs, higher for higher tiers and good user rates
        log_odds = (
            2.0 
            - 0.0005 * total_cost 
            + 0.5 * budget_tier_code 
            + 0.3 * has_flight 
            + 0.4 * has_hotel 
            + 1.5 * user_approval_rate
        )
        prob = 1 / (1 + np.exp(-log_odds))
        approved = (prob > 0.5).astype(int)
        
        df_class = pd.DataFrame({
            'total_cost': total_cost,
            'budget_tier_code': budget_tier_code,
            'has_flight': has_flight,
            'has_hotel': has_hotel,
            'has_restaurant': has_restaurant,
            'has_ride': has_ride,
            'user_approval_rate': user_approval_rate,
            'approved': approved
        })
        
        X_class = df_class.drop('approved', axis=1)
        y_class = df_class['approved']
        
        # Chronological or standard split
        X_train, X_test, y_train, y_test = train_test_split(X_class, y_class, test_size=0.2, random_state=42)
        
        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(X_train)
        
        model_class = LogisticRegression()
        model_class.fit(X_train_scaled, y_train)
        
        # Save classification model and scaler
        joblib.dump(model_class, os.path.join(model_dir, 'approval_model.joblib'))
        joblib.dump(scaler, os.path.join(model_dir, 'approval_scaler.joblib'))
        self.stdout.write(self.style.SUCCESS("Successfully trained and saved Approval Probability model."))
        
        # 2. Train Future Cost Prediction Model (Regression)
        # Features: base_cost, days_ahead, month, budget_tier_code
        base_cost = np.random.uniform(100, 8000, n_samples)
        days_ahead = np.random.randint(1, 180, n_samples)
        month = np.random.randint(1, 13, n_samples)
        
        # Predicted price is base_cost + seasonal variation (e.g. summer/winter peak) + inflation/days ahead
        seasonal_multiplier = 1.0 + 0.15 * np.sin(2 * np.pi * month / 12)  # Peak in summer
        days_ahead_inflation = 1.0 + (days_ahead / 365) * 0.05  # 5% annual inflation
        predicted_cost = base_cost * seasonal_multiplier * days_ahead_inflation
        
        df_reg = pd.DataFrame({
            'base_cost': base_cost,
            'days_ahead': days_ahead,
            'month': month,
            'budget_tier_code': budget_tier_code,
            'predicted_cost': predicted_cost
        })
        
        X_reg = df_reg.drop('predicted_cost', axis=1)
        y_reg = df_reg['predicted_cost']
        
        X_train_reg, X_test_reg, y_train_reg, y_test_reg = train_test_split(X_reg, y_reg, test_size=0.2, random_state=42)
        
        scaler_reg = StandardScaler()
        X_train_reg_scaled = scaler_reg.fit_transform(X_train_reg)
        
        model_reg = LinearRegression()
        model_reg.fit(X_train_reg_scaled, y_train_reg)
        
        # Save regression model and scaler
        joblib.dump(model_reg, os.path.join(model_dir, 'cost_model.joblib'))
        joblib.dump(scaler_reg, os.path.join(model_dir, 'cost_scaler.joblib'))
        self.stdout.write(self.style.SUCCESS("Successfully trained and saved Future Cost Prediction model."))
