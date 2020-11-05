import plotly.express as px
import pandas as pd


def update_figures():
    dfs = pd.read_html("battleground-state-changes.html", header=1, parse_dates=True)
    order = ["Alaska", "Arizona", "Georgia", "North Carolina", "Nevada", "Pennsylvania"]

    for i, df in enumerate(dfs):
        df = df[::-1]
        fig = px.line(df, x="Timestamp", y="Vote Differential", title=order[i])
        fig.write_html(f"figures/{order[i]}.html")

