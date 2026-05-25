import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, OneHotEncoder, LabelEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
import joblib # To save label_encoder

def preprocess_data(df_path='/content/cleaned_ensemble_training_dataset.csv'):
    """
    Loads, preprocesses data, and splits into training/testing sets.
    Returns preprocessed data, label encoder, and feature names.
    """
    try:
        df = pd.read_csv(df_path)
    except FileNotFoundError:
        print(f"Error: '{df_path}' not found. Please ensure the file is uploaded.")
        return None, None, None, None, None, None, None, None

    # Separate target variable 'Recommended_Crop'
    X = df.drop('Recommended_Crop', axis=1)
    y = df['Recommended_Crop']

    # Identify numerical and categorical features
    numerical_features = X.select_dtypes(include=np.number).columns.tolist()
    categorical_features = X.select_dtypes(include='object').columns.tolist()

    # Move 'Irrigation' to categorical features if it's there
    if 'Irrigation' in numerical_features:
        numerical_features.remove('Irrigation')
        categorical_features.insert(0, 'Irrigation') # Add at the beginning

    # Create preprocessing pipelines for numerical and categorical features
    numerical_transformer = Pipeline(steps=[
        ('imputer', SimpleImputer(strategy='mean')),
        ('scaler', StandardScaler())
    ])

    categorical_transformer = Pipeline(steps=[
        ('imputer', SimpleImputer(strategy='most_frequent')),
        ('onehot', OneHotEncoder(handle_unknown='ignore'))
    ])

    # Create a column transformer
    preprocessor = ColumnTransformer(
        transformers=[
            ('num', numerical_transformer, numerical_features),
            ('cat', categorical_transformer, categorical_features)
        ])

    # Split data into training and testing sets
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

    # Initialize and fit LabelEncoder
    label_encoder = LabelEncoder()
    y_train_encoded = label_encoder.fit_transform(y_train)
    y_test_encoded = label_encoder.transform(y_test)

    # Save the fitted LabelEncoder
    joblib.dump(label_encoder, 'label_encoder.joblib')
    print("Label encoder saved as 'label_encoder.joblib'")

    return X_train, X_test, y_train_encoded, y_test_encoded, preprocessor, label_encoder, numerical_features, categorical_features

if __name__ == '__main__':
    print("Running data_preprocessing.py directly for demonstration...")
    X_train, X_test, y_train_encoded, y_test_encoded, preprocessor, label_encoder, _, _ = preprocess_data()
    if X_train is not None:
        print("Data preprocessing complete and label_encoder saved.")
