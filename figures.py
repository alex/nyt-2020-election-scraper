import plotly.express as px
import pandas as pd


def update_figures():
    dfs = pd.read_html("battleground-state-changes.html", header=1, parse_dates=True)
    order = ["Alaska", "Arizona", "Georgia", "North Carolina", "Nevada", "Pennsylvania"]

    for i, df in enumerate(dfs):
        df = df[::-1]
        split = df["Block Breakdown"].fillna("Biden 0% / Trump 0%")
        Biden = []
        Trump = []
        for x in split:
            items = x.split("/")
            for item in items:
                if "Biden" in item:
                    try:
                        Biden.append(float(item.strip(" ").split(" ")[1].strip("%")))
                    except:
                        Biden.append(float(item.strip(" ").split(" ")[0].strip("%")))
                else:
                    Trump.append(float(item.strip(" ").split(" ")[1].strip("%")))
        change = [x for x in df["Change"]]
        bvotes = []
        tvotes = []
        for c, b, t in zip(change, Biden, Trump):
            bvotes.append(c * (b / 100))
            tvotes.append(c * (t / 100))
        df["Biden"] = bvotes
        df["Trump"] = tvotes
        df["Btotal"] = df["Biden"].cumsum()
        df["Ttotal"] = df["Trump"].cumsum()
        fig = px.line(df, x="Timestamp", y="Vote Differential")
        fig.update_traces(line_color="#ffa600", name="Vote Differential")
        fig.add_bar(x=df["Timestamp"], y=df["Biden"], name="Biden votes")
        fig.add_bar(x=df["Timestamp"], y=df["Trump"], name="Trump votes")
        fig.add_scatter(
            x=df["Timestamp"],
            y=df["Btotal"],
            mode="lines",
            name="Biden",
            line_color="#4634eb",
        )
        fig.add_scatter(
            x=df["Timestamp"],
            y=df["Ttotal"],
            mode="lines",
            name="Trump",
            line_color="#eb4034",
        )
        fig.write_html(f"figures/{order[i]}.html")

