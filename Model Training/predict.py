import pandas as pd
import joblib
import numpy as np # For creating a sample input DataFrame

def make_prediction(new_data_point, model_path='best_xgb_model.joblib', label_encoder_path='label_encoder.joblib'):
    """
    Loads a trained model and label encoder, then makes a prediction on new data.

    Args:
        new_data_point (pd.DataFrame): A DataFrame with one row representing the new data point,
                                       with columns matching the training features.
        model_path (str): Path to the saved model (.joblib file).
        label_encoder_path (str): Path to the saved label encoder (.joblib file).

    Returns:
        str: The predicted crop name.
    """
    try:
        best_xgb_model = joblib.load(model_path)
        label_encoder = joblib.load(label_encoder_path)
    except FileNotFoundError:
        print(f"Error: Model '{model_path}' or Label Encoder '{label_encoder_path}' not found.")
        return None
    except Exception as e:
        print(f"An error occurred while loading files: {e}")
        return None

    # Make prediction (returns encoded label)
    predicted_label_encoded = best_xgb_model.predict(new_data_point)

    # Inverse transform to get the original crop name
    predicted_crop = label_encoder.inverse_transform(predicted_label_encoded)

    return predicted_crop[0]

if __name__ == '__main__':
    # Example usage: Create a dummy new data point
    # Ensure this matches the structure of your training data (X)
    # You would replace these with actual values from a new farm
    sample_data = {
        'pH': [6.5],
        'Nitrogen': [0.18],
        'Phosphorus': [18.0],
        'Potassium': [140.0],
        'Organic_Carbon': [2.1],
        'Soil_Texture': ['Loamy'],
        'Rainfall_mm': [50.0],
        'Temperature_C': [25.0],
        'Market_Price_KES': [7000.0],
        'Farm_Size_ha': [1.5],
        'Irrigation': [1],
        'Input_Budget_KES': [13000.0],
        'Farmer_Profile': ['Progressive'],
        'Sub_County': ['Bondo'],
        'Season': ['dry'],
        'Humidity_pct': [75.0],
        'market_signal': ['fair']
    }
    new_farm_data = pd.DataFrame(sample_data)

    print("Making prediction for a sample farm data point...")
    predicted_crop = make_prediction(new_farm_data)

    if predicted_crop:
        print(f"The recommended crop for the sample data is: {predicted_crop}")

    # You can also load existing files for testing if they are present
    # print("\nTesting with a row from the original dataset (assuming it exists and model/encoder are trained):")
    # try:
    #     # This part assumes 'cleaned_ensemble_training_dataset.csv' is available
    #     # and model/label_encoder have been saved from a previous run or train_and_save_model.py
    #     df_original = pd.read_csv('/content/cleaned_ensemble_training_dataset.csv')
    #     test_row_index = 0 # Or any other index
    #     test_row_features = df_original.drop('Recommended_Crop', axis=1).iloc[[test_row_index]]
    #     actual_crop = df_original['Recommended_Crop'].iloc[test_row_index]
    #     predicted_test_crop = make_prediction(test_row_features)
    #     print(f"Actual crop for row {test_row_index}: {actual_crop}")
    #     print(f"Predicted crop for row {test_row_index}: {predicted_test_crop}")
    # except FileNotFoundError:
    #     print("Original dataset not found for testing.")
    # except Exception as e:
    #     print(f"Error during testing with original dataset: {e}")
