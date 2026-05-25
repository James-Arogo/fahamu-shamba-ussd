import pandas as pd
from sklearn.pipeline import Pipeline
from sklearn.model_selection import GridSearchCV
from xgboost import XGBClassifier
import joblib

# Assuming data_preprocessing.py is in the same directory
from data_preprocessing import preprocess_data

def train_and_save_model(df_path='/content/cleaned_ensemble_training_dataset.csv'):
    """
    Loads preprocessed data, trains an XGBoost model with GridSearchCV,
    and saves the best model.
    """
    X_train, X_test, y_train_encoded, y_test_encoded, preprocessor, label_encoder, _, _ = preprocess_data(df_path)

    if X_train is None:
        print("Preprocessing failed, cannot train model.")
        return

    # Create a pipeline for XGBoost Classifier
    xgb_pipeline = Pipeline(steps=[
        ('preprocessor', preprocessor),
        ('classifier', XGBClassifier(objective='multi:softmax', use_label_encoder=False, eval_metric='mlogloss', random_state=42))
    ])

    # Define parameter grid for XGBoost
    param_grid_xgb = {
        'classifier__n_estimators': [100, 200],
        'classifier__learning_rate': [0.05, 0.1],
        'classifier__max_depth': [3, 5],
        'classifier__subsample': [0.7, 0.9]
    }

    # Initialize GridSearchCV for XGBoost
    grid_search_xgb = GridSearchCV(xgb_pipeline, param_grid_xgb, cv=3, verbose=2, n_jobs=-1, scoring='accuracy')

    print("Starting GridSearchCV for XGBoost...")
    grid_search_xgb.fit(X_train, y_train_encoded) # Fit with encoded target variable
    print("GridSearchCV for XGBoost complete.")

    # Best parameters and score for XGBoost
    best_params_xgb = grid_search_xgb.best_params_
    best_score_xgb = grid_search_xgb.best_score_

    print(f"\nBest Parameters for XGBoost: {best_params_xgb}")
    print(f"Best Cross-validation Accuracy for XGBoost: {best_score_xgb:.4f}")

    best_xgb_model = grid_search_xgb.best_estimator_

    # Save the best XGBoost model (pipeline)
    model_filename = 'best_xgb_model.joblib'
    joblib.dump(best_xgb_model, model_filename)
    print(f"Tuned XGBoost model saved as '{model_filename}'")
    print("\nYou can now download these files ('best_xgb_model.joblib' and 'label_encoder.joblib') for deployment.")

if __name__ == '__main__':
    print("Running train_and_save_model.py directly...")
    train_and_save_model()
