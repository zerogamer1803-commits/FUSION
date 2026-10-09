
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

from sklearn.ensemble import RandomForestRegressor, ExtraTreesRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split

PROJECT_DIR = Path(__file__).resolve().parent.parent

DATA_PATH = (
    PROJECT_DIR
    / "Failure Analysis in Power Transformers Dataset"
    / "Health index1.csv"
)

OUTPUT_PATH = PROJECT_DIR / "ml" / "health_index_model.joblib"


def main():
    print("Loading transformer dataset...")

    df = pd.read_csv(DATA_PATH)
    df.columns = df.columns.str.strip()

    df = df.rename(columns={
        "Oxigen": "Oxygen",
        "Acethylene": "Acetylene",
    })

    features = [
        "Hydrogen",
        "Oxygen",
        "Nitrogen",
        "Methane",
        "CO",
        "CO2",
        "Ethylene",
        "Ethane",
        "Acetylene",
        "DBDS",
        "Power factor",
        "Interfacial V",
        "Dielectric rigidity",
        "Water content",
    ]

    targets = ["Health index", "Life expectation"]

    required_columns = features + targets
    missing = [
        column for column in required_columns
        if column not in df.columns
    ]

    if missing:
        raise ValueError(
            f"Missing dataset columns: {missing}\n"
            f"Available columns: {df.columns.tolist()}"
        )

    for column in required_columns:
        df[column] = pd.to_numeric(
            df[column], errors="coerce"
        )

    df = df.replace([np.inf, -np.inf], np.nan)
    df = df.dropna(subset=required_columns)

    if len(df) < 20:
        raise ValueError(
            f"Not enough complete rows: {len(df)}"
        )

    X = df[features]
    y_health = df["Health index"]
    y_life = df["Life expectation"]

    (
        X_train,
        X_test,
        health_train,
        health_test,
        life_train,
        life_test,
    ) = train_test_split(
        X,
        y_health,
        y_life,
        test_size=0.20,
        random_state=42,
    )

    health_model = RandomForestRegressor(
        n_estimators=300,
        random_state=42,
        min_samples_leaf=2,
        n_jobs=-1,
    )

    life_model = ExtraTreesRegressor(
        n_estimators=300,
        random_state=42,
        min_samples_leaf=2,
        n_jobs=-1,
    )

    print(f"Usable dataset rows: {len(df)}")
    print("Training Health Index model...")
    health_model.fit(X_train, health_train)

    print("Training Life Expectation model...")
    life_model.fit(X_train, life_train)

    def evaluate(name, model, actual):
        predicted = model.predict(X_test)

        mae = mean_absolute_error(actual, predicted)
        rmse = np.sqrt(
            mean_squared_error(actual, predicted)
        )
        r2 = r2_score(actual, predicted)

        print(f"\n{name} evaluation:")
        print(f"MAE : {mae:.4f}")
        print(f"RMSE: {rmse:.4f}")
        print(f"R2  : {r2:.4f}")

    evaluate(
        "Health Index",
        health_model,
        health_test,
    )

    evaluate(
        "Life Expectation",
        life_model,
        life_test,
    )

    bundle = {
        "features": features,
        "health_model": health_model,
        "life_model": life_model,
    }

    joblib.dump(bundle, OUTPUT_PATH)

    print("\nModel saved successfully!")
    print(f"Saved at: {OUTPUT_PATH}")
    print(f"Training rows: {len(X_train)}")
    print(f"Testing rows: {len(X_test)}")
    print(
        "\nNote: Predictions are based on the supplied dataset "
        "and are not certified transformer assessments."
    )


if __name__ == "__main__":
    main()
